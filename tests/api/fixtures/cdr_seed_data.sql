-- CDR Test Data
-- Auto-generated from production database with anonymization
-- Generated: 2025-10-24T11:08:40.510176
-- Total records: 30

-- Clear existing test data
DELETE FROM cdr_general WHERE id BETWEEN 1 AND 1000;

BEGIN TRANSACTION;

-- Record 1: ANSWERED | 79300250234 -> 262 | 150s
INSERT INTO cdr_general (
    id, start, endtime, answer,
    src_num, dst_num, disposition,
    recordingfile, billsec, duration,
    UNIQUEID, linkedid
) VALUES (
    1,
    '2025-10-10 16:46:24.000',
    '2025-10-10 17:46:00.000',
    '2025-10-01 10:04:50.000',
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
    '2025-10-06 12:59:34.000',
    '2025-10-01 12:16:24.000',
    '2025-10-03 15:01:50.000',
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
    '2025-10-20 17:18:35.000',
    '2025-10-14 10:33:48.000',
    '2025-10-18 15:21:41.000',
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
    '2025-10-08 10:51:35.000',
    '2025-10-01 17:38:17.000',
    '2025-10-21 11:02:11.000',
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
    '2025-10-19 10:36:34.000',
    '2025-10-15 15:02:26.000',
    '2025-10-16 14:57:55.000',
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
    '2025-10-05 17:53:50.000',
    '2025-10-11 15:50:11.000',
    '2025-10-06 10:10:13.000',
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
    '2025-10-10 09:39:39.000',
    '2025-10-06 09:26:55.000',
    '2025-10-09 11:44:25.000',
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
    '2025-10-07 12:02:58.000',
    '2025-10-04 11:24:08.000',
    '2025-10-11 16:34:55.000',
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
    '2025-10-12 15:08:14.000',
    '2025-10-16 16:02:53.000',
    '2025-10-01 12:14:03.000',
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
    '2025-10-20 09:05:26.000',
    '2025-10-24 11:48:58.000',
    '2025-10-05 16:36:04.000',
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
    '2025-10-23 14:55:14.000',
    '2025-10-16 09:28:13.000',
    '2025-10-22 14:14:40.000',
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
    '2025-10-14 14:45:56.000',
    '2025-10-10 12:13:42.000',
    '2025-10-08 13:07:57.000',
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
    '2025-10-14 10:41:37.000',
    '2025-10-04 15:24:59.000',
    '2025-10-02 14:48:37.000',
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
    '2025-10-21 10:48:50.000',
    '2025-10-08 09:05:38.000',
    '2025-10-13 11:31:34.000',
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
    '2025-10-10 14:21:46.000',
    '2025-10-24 11:11:04.000',
    '2025-10-15 15:45:27.000',
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
    '2025-10-08 15:40:06.000',
    '2025-10-05 16:48:40.000',
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
    '2025-10-18 17:40:09.000',
    '2025-10-24 16:30:35.000',
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
    '2025-10-23 14:32:19.000',
    '2025-10-13 17:40:59.000',
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
    '2025-10-12 10:01:04.000',
    '2025-10-03 17:08:26.000',
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
    '2025-10-15 17:35:33.000',
    '2025-10-17 09:06:43.000',
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
    '2025-10-12 16:48:51.000',
    '2025-10-20 16:37:26.000',
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
    '2025-10-14 14:48:09.000',
    '2025-10-07 09:09:53.000',
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
    '2025-10-18 17:47:47.000',
    '2025-10-22 11:12:55.000',
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
    '2025-10-05 16:11:24.000',
    '2025-10-24 10:04:41.000',
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
    '2025-10-13 09:58:52.000',
    '2025-10-03 17:43:01.000',
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
    '2025-10-08 17:32:24.000',
    '2025-10-17 12:30:12.000',
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
    '2025-10-13 11:48:15.000',
    '2025-10-24 13:20:24.000',
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
    '2025-10-04 15:51:15.000',
    '2025-10-21 10:51:43.000',
    '2025-10-19 17:46:01.000',
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
    '2025-10-04 14:02:18.000',
    '2025-10-11 11:26:35.000',
    '2025-10-22 15:17:33.000',
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
    '2025-10-05 10:55:54.000',
    '2025-10-15 16:31:54.000',
    '2025-10-06 10:57:39.000',
    '207',
    '000063',
    'ANSWERED',
    '',
    2,
    2,
    'mikopbx-1730294137.10355_F1E3zW',
    'mikopbx-1730294137.10355'
);

COMMIT;

-- Summary:
--   ANSWERED: 18
--   BUSY: 1
--   CANCEL: 3
--   NOANSWER: 8
--   With recordings: 15
