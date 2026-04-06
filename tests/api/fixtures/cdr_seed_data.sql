-- CDR Test Data
-- Auto-generated with dynamic dates
-- Generated: 2025-12-30T19:05:51.121398
-- Total records: 36 (includes 3 linked call records)

-- Clear existing test data
DELETE FROM cdr_general WHERE id BETWEEN 1 AND 1000;

-- Reset SQLite autoincrement counter for cdr_general table
-- WHY: Without this, SQLite continues counting from the highest previous ID
-- Example: If ID 50 existed before, next INSERT gets ID 51 even if we specify ID 1
DELETE FROM sqlite_sequence WHERE name='cdr_general';
INSERT INTO sqlite_sequence (name, seq) VALUES ('cdr_general', 0);

BEGIN TRANSACTION;

-- Record 1: ANSWERED | 79300250234 -> 262 | 150s
INSERT INTO cdr_general (
    id, start, endtime, answer,
    src_num, dst_num, disposition,
    recordingfile, billsec, duration,
    UNIQUEID, linkedid
) VALUES (
    1,
    '2025-12-01 09:00:00.000',
    '2025-12-01 09:02:44.000',
    '2025-12-01 09:00:03.000',
    '79300250234',
    '262',
    'ANSWERED',
    '/storage/usbdisk1/mikopbx/astspool/monitor/2023/10/03/10/mikopbx-1696316579.10565_0Fk3uO.mp3',
    150,
    154,
    'mikopbx-1696316579.10565_0Fk3uO',
    'mikopbx-1696316566.10557'
);

-- Record 2: ANSWERED | 79794956057 -> 270 | 224s
INSERT INTO cdr_general (
    id, start, endtime, answer,
    src_num, dst_num, disposition,
    recordingfile, billsec, duration,
    UNIQUEID, linkedid
) VALUES (
    2,
    '2025-12-01 12:17:31.000',
    '2025-12-01 12:21:38.000',
    '2025-12-01 12:17:35.000',
    '79794956057',
    '270',
    'ANSWERED',
    '/storage/usbdisk1/mikopbx/astspool/monitor/2024/01/26/12/mikopbx-1706262120.58959_3VE285.mp3',
    224,
    237,
    'mikopbx-1706262120.58959_3VE285',
    'mikopbx-1706262112.58950'
);

-- Record 3: ANSWERED | 79068987331 -> 79215156610 | 8s
INSERT INTO cdr_general (
    id, start, endtime, answer,
    src_num, dst_num, disposition,
    recordingfile, billsec, duration,
    UNIQUEID, linkedid
) VALUES (
    3,
    '2025-12-02 15:34:02.000',
    '2025-12-02 15:34:54.000',
    '2025-12-02 15:34:07.000',
    '79068987331',
    '79215156610',
    'ANSWERED',
    '/storage/usbdisk1/mikopbx/astspool/monitor/2024/04/22/11/mikopbx-1713774129.4196_1bjdot.mp3',
    8,
    42,
    'mikopbx-1713774129.4196_1bjdot',
    'mikopbx-1713774129.4196'
);

-- Record 4: ANSWERED | 207 -> 79284770441 | 88s
INSERT INTO cdr_general (
    id, start, endtime, answer,
    src_num, dst_num, disposition,
    recordingfile, billsec, duration,
    UNIQUEID, linkedid
) VALUES (
    4,
    '2025-12-03 09:51:33.000',
    '2025-12-03 09:53:14.000',
    '2025-12-03 09:51:39.000',
    '207',
    '79284770441',
    'ANSWERED',
    '/storage/usbdisk1/mikopbx/astspool/monitor/2023/02/27/10/mikopbx-1677482516.37899_ViH8gh.mp3',
    88,
    91,
    'mikopbx-1677482516.37899_ViH8gh',
    'mikopbx-1677482516.37899'
);

-- Record 5: ANSWERED | 226 -> 79872226831 | 105s
INSERT INTO cdr_general (
    id, start, endtime, answer,
    src_num, dst_num, disposition,
    recordingfile, billsec, duration,
    UNIQUEID, linkedid
) VALUES (
    5,
    '2025-12-04 12:08:04.000',
    '2025-12-04 12:10:05.000',
    '2025-12-04 12:08:11.000',
    '226',
    '79872226831',
    'ANSWERED',
    '/storage/usbdisk1/mikopbx/astspool/monitor/2024/12/23/14/mikopbx-1734953069.310_4iuMz0.mp3',
    105,
    111,
    'mikopbx-1734953069.310_4iuMz0',
    'mikopbx-1734953069.308'
);

-- Record 6: ANSWERED | 239 -> 79968076947 | 210s
INSERT INTO cdr_general (
    id, start, endtime, answer,
    src_num, dst_num, disposition,
    recordingfile, billsec, duration,
    UNIQUEID, linkedid
) VALUES (
    6,
    '2025-12-05 15:25:35.000',
    '2025-12-05 15:29:41.000',
    '2025-12-05 15:25:43.000',
    '239',
    '79968076947',
    'ANSWERED',
    '/storage/usbdisk1/mikopbx/astspool/monitor/2023/06/13/10/mikopbx-1686643092.6506_264Zie.mp3',
    210,
    236,
    'mikopbx-1686643092.6506_264Zie',
    'mikopbx-1686643091.6503'
);

-- Record 7: ANSWERED | 79548691864 -> 236 | 315s
INSERT INTO cdr_general (
    id, start, endtime, answer,
    src_num, dst_num, disposition,
    recordingfile, billsec, duration,
    UNIQUEID, linkedid
) VALUES (
    7,
    '2025-12-05 09:42:06.000',
    '2025-12-05 09:47:36.000',
    '2025-12-05 09:42:15.000',
    '79548691864',
    '236',
    'ANSWERED',
    '/storage/usbdisk1/mikopbx/astspool/monitor/2025/02/28/10/mikopbx-1740729335.18459_7cB7iY.mp3',
    315,
    320,
    'mikopbx-1740729335.18459_7cB7iY',
    'mikopbx-1740729335.18457'
);

-- Record 8: ANSWERED | 79794956057 -> 79610135584 | 422s
INSERT INTO cdr_general (
    id, start, endtime, answer,
    src_num, dst_num, disposition,
    recordingfile, billsec, duration,
    UNIQUEID, linkedid
) VALUES (
    8,
    '2025-12-06 12:59:37.000',
    '2025-12-06 13:06:59.000',
    '2025-12-06 12:59:47.000',
    '79794956057',
    '79610135584',
    'ANSWERED',
    '/storage/usbdisk1/mikopbx/astspool/monitor/2024/06/07/14/mikopbx-1717758889.4649_1qDtQ1.mp3',
    422,
    432,
    'mikopbx-1717758889.4649_1qDtQ1',
    'mikopbx-1717758875.4640'
);

-- Record 9: ANSWERED | 238 -> 79164981151 | 96s
INSERT INTO cdr_general (
    id, start, endtime, answer,
    src_num, dst_num, disposition,
    recordingfile, billsec, duration,
    UNIQUEID, linkedid
) VALUES (
    9,
    '2025-12-07 15:16:08.000',
    '2025-12-07 15:18:05.000',
    '2025-12-07 15:16:11.000',
    '238',
    '79164981151',
    'ANSWERED',
    '/storage/usbdisk1/mikopbx/astspool/monitor/2024/02/05/15/mikopbx-1707135477.2062_A9mZnQ.mp3',
    96,
    107,
    'mikopbx-1707135477.2062_A9mZnQ',
    'mikopbx-1707135477.2060'
);

-- Record 10: ANSWERED | 79530337713 -> 209 | 14s
INSERT INTO cdr_general (
    id, start, endtime, answer,
    src_num, dst_num, disposition,
    recordingfile, billsec, duration,
    UNIQUEID, linkedid
) VALUES (
    10,
    '2025-12-08 09:33:39.000',
    '2025-12-08 09:34:10.000',
    '2025-12-08 09:33:43.000',
    '79530337713',
    '209',
    'ANSWERED',
    '/storage/usbdisk1/mikopbx/astspool/monitor/2025/04/08/16/mikopbx-1744118453.5744_YNq6Q3.mp3',
    14,
    21,
    'mikopbx-1744118453.5744_YNq6Q3',
    'mikopbx-1744118401.5740'
);

-- Record 11: ANSWERED | 79162741185 -> 209 | 178s
INSERT INTO cdr_general (
    id, start, endtime, answer,
    src_num, dst_num, disposition,
    recordingfile, billsec, duration,
    UNIQUEID, linkedid
) VALUES (
    11,
    '2025-12-09 12:50:10.000',
    '2025-12-09 12:53:18.000',
    '2025-12-09 12:50:15.000',
    '79162741185',
    '209',
    'ANSWERED',
    '/storage/usbdisk1/mikopbx/astspool/monitor/2024/01/31/16/mikopbx-1706706795.62413.mp3',
    178,
    178,
    'mikopbx-1706706795.62413',
    'mikopbx-1706706794.62410'
);

-- Record 12: ANSWERED | 79639903934 -> 261 | 38s
INSERT INTO cdr_general (
    id, start, endtime, answer,
    src_num, dst_num, disposition,
    recordingfile, billsec, duration,
    UNIQUEID, linkedid
) VALUES (
    12,
    '2025-12-10 15:07:41.000',
    '2025-12-10 15:08:41.000',
    '2025-12-10 15:07:47.000',
    '79639903934',
    '261',
    'ANSWERED',
    '/storage/usbdisk1/mikopbx/astspool/monitor/2024/03/07/17/mikopbx-1709821163.25647_Fd0803.mp3',
    38,
    50,
    'mikopbx-1709821163.25647_Fd0803',
    'mikopbx-1709821144.25635'
);

-- Record 13: ANSWERED | 262 -> 79137571857 | 4s
INSERT INTO cdr_general (
    id, start, endtime, answer,
    src_num, dst_num, disposition,
    recordingfile, billsec, duration,
    UNIQUEID, linkedid
) VALUES (
    13,
    '2025-12-10 09:24:12.000',
    '2025-12-10 09:25:02.000',
    '2025-12-10 09:24:19.000',
    '262',
    '79137571857',
    'ANSWERED',
    '/storage/usbdisk1/mikopbx/astspool/monitor/2023/07/10/15/mikopbx-1688992832.7694_55M6Gf.mp3',
    4,
    40,
    'mikopbx-1688992832.7694_55M6Gf',
    'mikopbx-1688992832.7692'
);

-- Record 14: ANSWERED | 239 -> 79660987446 | 45s
INSERT INTO cdr_general (
    id, start, endtime, answer,
    src_num, dst_num, disposition,
    recordingfile, billsec, duration,
    UNIQUEID, linkedid
) VALUES (
    14,
    '2025-12-11 12:41:43.000',
    '2025-12-11 12:42:40.000',
    '2025-12-11 12:41:51.000',
    '239',
    '79660987446',
    'ANSWERED',
    '/storage/usbdisk1/mikopbx/astspool/monitor/2023/04/14/17/mikopbx-1681481021.849_KuJW64.mp3',
    45,
    47,
    'mikopbx-1681481021.849_KuJW64',
    'mikopbx-1681481021.847'
);

-- Record 15: ANSWERED | 79988528433 -> 277 | 145s
INSERT INTO cdr_general (
    id, start, endtime, answer,
    src_num, dst_num, disposition,
    recordingfile, billsec, duration,
    UNIQUEID, linkedid
) VALUES (
    15,
    '2025-12-12 15:58:14.000',
    '2025-12-12 16:00:53.000',
    '2025-12-12 15:58:23.000',
    '79988528433',
    '277',
    'ANSWERED',
    '/storage/usbdisk1/mikopbx/astspool/monitor/2024/05/08/14/mikopbx-1715166527.303_PrV44z.mp3',
    145,
    149,
    'mikopbx-1715166527.303_PrV44z_PJSIP/274-0000009c',
    'mikopbx-1715166506.294'
);

-- Record 16: NOANSWER | 79090163435 -> 3 | 0s
INSERT INTO cdr_general (
    id, start, endtime, answer,
    src_num, dst_num, disposition,
    recordingfile, billsec, duration,
    UNIQUEID, linkedid
) VALUES (
    16,
    '2025-12-13 09:15:45.000',
    '2025-12-13 09:15:55.000',
    '',
    '79090163435',
    '3',
    'NOANSWER',
    '',
    0,
    0,
    'mikopbx-1725436279.315_B4CRBA',
    'mikopbx-1725436239.301'
);

-- Record 17: NOANSWER | 79392502565 -> 2200100 | 0s
INSERT INTO cdr_general (
    id, start, endtime, answer,
    src_num, dst_num, disposition,
    recordingfile, billsec, duration,
    UNIQUEID, linkedid
) VALUES (
    17,
    '2025-12-14 12:32:16.000',
    '2025-12-14 12:32:26.000',
    '',
    '79392502565',
    '2200100',
    'NOANSWER',
    '',
    0,
    0,
    'mikopbx-1684930597.521_IG3434',
    'mikopbx-1684930596.519'
);

-- Record 18: NOANSWER | 79941533893 -> 215 | 0s
INSERT INTO cdr_general (
    id, start, endtime, answer,
    src_num, dst_num, disposition,
    recordingfile, billsec, duration,
    UNIQUEID, linkedid
) VALUES (
    18,
    '2025-12-14 15:49:47.000',
    '2025-12-14 15:50:57.000',
    '',
    '79941533893',
    '215',
    'NOANSWER',
    '',
    0,
    60,
    'mikopbx-1688626454.3892_41MR83',
    'mikopbx-1688626435.3880'
);

-- Record 19: NOANSWER | 212 -> 213 | 0s
INSERT INTO cdr_general (
    id, start, endtime, answer,
    src_num, dst_num, disposition,
    recordingfile, billsec, duration,
    UNIQUEID, linkedid
) VALUES (
    19,
    '2025-12-15 09:06:18.000',
    '2025-12-15 09:06:38.000',
    '',
    '212',
    '213',
    'NOANSWER',
    '',
    0,
    10,
    'mikopbx-1673961289.9981_831lua',
    'mikopbx-1673961289.9981'
);

-- Record 20: NOANSWER | 238 -> 79794956057 | 0s
INSERT INTO cdr_general (
    id, start, endtime, answer,
    src_num, dst_num, disposition,
    recordingfile, billsec, duration,
    UNIQUEID, linkedid
) VALUES (
    20,
    '2025-12-16 12:23:49.000',
    '2025-12-16 12:24:00.000',
    '',
    '238',
    '79794956057',
    'NOANSWER',
    '',
    0,
    1,
    'mikopbx-1697716694.23133_017lPS',
    'mikopbx-1697716694.23132'
);

-- Record 21: NOANSWER | 79370204892 -> 2200100 | 0s
INSERT INTO cdr_general (
    id, start, endtime, answer,
    src_num, dst_num, disposition,
    recordingfile, billsec, duration,
    UNIQUEID, linkedid
) VALUES (
    21,
    '2025-12-17 15:40:20.000',
    '2025-12-17 15:40:30.000',
    '',
    '79370204892',
    '2200100',
    'NOANSWER',
    '',
    0,
    0,
    'mikopbx-1724074366.675_s737fj',
    'mikopbx-1724074366.673'
);

-- Record 22: NOANSWER | 79678594637 -> 257 | 0s
INSERT INTO cdr_general (
    id, start, endtime, answer,
    src_num, dst_num, disposition,
    recordingfile, billsec, duration,
    UNIQUEID, linkedid
) VALUES (
    22,
    '2025-12-18 09:57:51.000',
    '2025-12-18 09:58:02.000',
    '',
    '79678594637',
    '257',
    'NOANSWER',
    '',
    0,
    1,
    'mikopbx-1727161939.199_156Wi8',
    'mikopbx-1727161939.199'
);

-- Record 23: NOANSWER | 79466574072 -> 2200100 | 0s
INSERT INTO cdr_general (
    id, start, endtime, answer,
    src_num, dst_num, disposition,
    recordingfile, billsec, duration,
    UNIQUEID, linkedid
) VALUES (
    23,
    '2025-12-19 12:14:22.000',
    '2025-12-19 12:14:32.000',
    '',
    '79466574072',
    '2200100',
    'NOANSWER',
    '',
    0,
    0,
    'mikopbx-1707474822.6518_26s6Et',
    'mikopbx-1707474822.6514'
);

-- Record 24: BUSY | 238 -> 226 | 0s
INSERT INTO cdr_general (
    id, start, endtime, answer,
    src_num, dst_num, disposition,
    recordingfile, billsec, duration,
    UNIQUEID, linkedid
) VALUES (
    24,
    '2025-12-19 15:31:53.000',
    '2025-12-19 15:32:29.000',
    '',
    '238',
    '226',
    'BUSY',
    '',
    0,
    26,
    'mikopbx-1733382278.332_mnvWx4',
    'mikopbx-1733382278.332'
);

-- Record 25: CANCEL | 79320879471 -> 236 | 0s
INSERT INTO cdr_general (
    id, start, endtime, answer,
    src_num, dst_num, disposition,
    recordingfile, billsec, duration,
    UNIQUEID, linkedid
) VALUES (
    25,
    '2025-12-20 09:48:24.000',
    '2025-12-20 09:49:19.000',
    '',
    '79320879471',
    '236',
    'CANCEL',
    '',
    0,
    45,
    'mikopbx-1691739455.198_dqRA17',
    'mikopbx-1691739455.198'
);

-- Record 26: CANCEL | 79128704386 -> 236 | 0s
INSERT INTO cdr_general (
    id, start, endtime, answer,
    src_num, dst_num, disposition,
    recordingfile, billsec, duration,
    UNIQUEID, linkedid
) VALUES (
    26,
    '2025-12-21 12:05:55.000',
    '2025-12-21 12:06:09.000',
    '',
    '79128704386',
    '236',
    'CANCEL',
    '',
    0,
    4,
    'mikopbx-1734354855.7631_8x0w1U_PJSIP/233-00000ef1',
    'mikopbx-1734354855.7629'
);

-- Record 27: CANCEL | 79930024680 -> 236 | 0s
INSERT INTO cdr_general (
    id, start, endtime, answer,
    src_num, dst_num, disposition,
    recordingfile, billsec, duration,
    UNIQUEID, linkedid
) VALUES (
    27,
    '2025-12-22 15:22:26.000',
    '2025-12-22 15:22:38.000',
    '',
    '79930024680',
    '236',
    'CANCEL',
    '',
    0,
    2,
    'mikopbx-1692699682.3984_6H4823',
    'mikopbx-1692699682.3982'
);

-- Record 28: ANSWERED | 207 -> 000063 | 7s
INSERT INTO cdr_general (
    id, start, endtime, answer,
    src_num, dst_num, disposition,
    recordingfile, billsec, duration,
    UNIQUEID, linkedid
) VALUES (
    28,
    '2025-12-23 09:39:57.000',
    '2025-12-23 09:40:14.000',
    '2025-12-23 09:40:03.000',
    '207',
    '000063',
    'ANSWERED',
    '',
    7,
    7,
    'mikopbx-1715158559.193_4n8ig0',
    'mikopbx-1715158559.193'
);

-- Record 29: ANSWERED | 207 -> 000063 | 3s
INSERT INTO cdr_general (
    id, start, endtime, answer,
    src_num, dst_num, disposition,
    recordingfile, billsec, duration,
    UNIQUEID, linkedid
) VALUES (
    29,
    '2025-12-23 12:56:28.000',
    '2025-12-23 12:56:41.000',
    '2025-12-23 12:56:35.000',
    '207',
    '000063',
    'ANSWERED',
    '',
    3,
    3,
    'mikopbx-1751876658.10022_Qxj0lC',
    'mikopbx-1751876658.10022'
);

-- Record 30: ANSWERED | 207 -> 000063 | 2s
INSERT INTO cdr_general (
    id, start, endtime, answer,
    src_num, dst_num, disposition,
    recordingfile, billsec, duration,
    UNIQUEID, linkedid
) VALUES (
    30,
    '2025-12-24 15:13:59.000',
    '2025-12-24 15:14:11.000',
    '2025-12-24 15:14:07.000',
    '207',
    '000063',
    'ANSWERED',
    '',
    2,
    2,
    'mikopbx-1730294137.10355_F1E3zW',
    'mikopbx-1730294137.10355'
);

-- Record 31: ANSWERED | 79001234567 -> 201 | 30s
INSERT INTO cdr_general (
    id, start, endtime, answer,
    src_num, dst_num, disposition,
    recordingfile, billsec, duration,
    UNIQUEID, linkedid
) VALUES (
    31,
    '2025-12-25 09:30:30.000',
    '2025-12-25 09:31:15.000',
    '2025-12-25 09:30:39.000',
    '79001234567',
    '201',
    'ANSWERED',
    '/storage/usbdisk1/mikopbx/astspool/monitor/2025/10/18/14/mikopbx-linked-call.100_leg1.mp3',
    30,
    35,
    'mikopbx-linked-call.100',
    'mikopbx-linked-call.100'
);

-- Record 32: ANSWERED | 201 -> 202 | 260s
INSERT INTO cdr_general (
    id, start, endtime, answer,
    src_num, dst_num, disposition,
    recordingfile, billsec, duration,
    UNIQUEID, linkedid
) VALUES (
    32,
    '2025-12-26 12:47:01.000',
    '2025-12-26 12:51:36.000',
    '2025-12-26 12:47:11.000',
    '201',
    '202',
    'ANSWERED',
    '/storage/usbdisk1/mikopbx/astspool/monitor/2025/10/18/14/mikopbx-linked-call.101_leg2.mp3',
    260,
    265,
    'mikopbx-linked-call.101',
    'mikopbx-linked-call.100'
);

-- Record 33: ANSWERED | 202 -> 203 | 290s
INSERT INTO cdr_general (
    id, start, endtime, answer,
    src_num, dst_num, disposition,
    recordingfile, billsec, duration,
    UNIQUEID, linkedid
) VALUES (
    33,
    '2025-12-27 15:04:32.000',
    '2025-12-27 15:09:37.000',
    '2025-12-27 15:04:35.000',
    '202',
    '203',
    'ANSWERED',
    '/storage/usbdisk1/mikopbx/astspool/monitor/2025/10/18/14/mikopbx-linked-call.102_leg3.mp3',
    290,
    295,
    'mikopbx-linked-call.102',
    'mikopbx-linked-call.100'
);


-- Linked Calls (shared linkedid for testing linkedid-based deletion)
-- These 3 records share linkedid 'mikopbx-linked-call.100'
-- Record 34: ANSWERED | 79001234567 -> 201 | 45s
INSERT INTO cdr_general (
    id, start, endtime, answer,
    src_num, dst_num, disposition,
    recordingfile, billsec, duration,
    UNIQUEID, linkedid
) VALUES (
    34,
    '2025-12-25 09:21:03.000',
    '2025-12-25 09:22:03.000',
    '2025-12-25 09:21:07.000',
    '79001234567',
    '201',
    'ANSWERED',
    '/storage/usbdisk1/mikopbx/astspool/monitor/2025/01/01/10/mikopbx-linked-call.34_leg1.mp3',
    45,
    50,
    'mikopbx-linked-call.34_leg1',
    'mikopbx-linked-call.100'
);

-- Record 35: ANSWERED | 201 -> 202 | 120s
INSERT INTO cdr_general (
    id, start, endtime, answer,
    src_num, dst_num, disposition,
    recordingfile, billsec, duration,
    UNIQUEID, linkedid
) VALUES (
    35,
    '2025-12-26 12:38:34.000',
    '2025-12-26 12:40:49.000',
    '2025-12-26 12:38:39.000',
    '201',
    '202',
    'ANSWERED',
    '/storage/usbdisk1/mikopbx/astspool/monitor/2025/01/01/10/mikopbx-linked-call.35_leg2.mp3',
    120,
    125,
    'mikopbx-linked-call.35_leg2',
    'mikopbx-linked-call.100'
);

-- Record 36: ANSWERED | 202 -> 203 | 30s
INSERT INTO cdr_general (
    id, start, endtime, answer,
    src_num, dst_num, disposition,
    recordingfile, billsec, duration,
    UNIQUEID, linkedid
) VALUES (
    36,
    '2025-12-27 15:55:05.000',
    '2025-12-27 15:55:50.000',
    '2025-12-27 15:55:11.000',
    '202',
    '203',
    'ANSWERED',
    '',
    30,
    35,
    'mikopbx-linked-call.36_leg3',
    'mikopbx-linked-call.100'
);

COMMIT;

-- Summary:
--   ANSWERED: 24
--   BUSY: 1
--   CANCEL: 3
--   NOANSWER: 8
--   With recordings: 20
--   Linked call records (shared linkedid): 6
