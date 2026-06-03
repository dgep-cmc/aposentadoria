// Constants and Career Data for the DGEP tools

export const SALARY_CAP_GENERAL = 37068.57;
export const SALARY_CAP_PROCURADOR = 46366.19;

export const romanNumerals = [
  'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI', 'XXII', 'XXIII', 'XXIV', 'XXV', 'XXVI', 'XXVII', 'XXVIII', 'XXIX', 'XXX', 'XXXI', 'XXXII', 'XXXIII', 'XXXIV', 'XXXV', 'XXXVI'
];

export const fgValues = {
  'FG4': 1518.01,
  'FG5': 3035.98,
  'FG6': 7727.99,
  'FG7': 13247.97,
  'FG8': 16007.98
};

export const stimulusPercentages = {
  'graduacao': 0.30,
  'pos_graduacao': 0.10,
  'mestrado': 0.15,
  'doutorado': 0.20
};

export const ATS_PERCENTAGES = [0.00, 0.05, 0.10, 0.15, 0.20, 0.25, 0.30, 0.35, 0.40, 0.45, 0.50];

export const careerDisplayNames: { [key: string]: string } = {
  analista_adm_rh: "Analista de Administração e RH",
  analista_comissoes: "Analista às Comissões",
  analista_economico: "Analista Econômico Financeiro",
  analista_legislativo: "Analista Legislativo",
  analista_sistemas: "Analista de Sistemas",
  assistente_administrativo: "Assistente Administrativo",
  assistente_social: "Assistente Social",
  auxiliar_de_seguranca: "Auxiliar de Segurança",
  bibliotecario: "Bibliotecário",
  contador: "Contador",
  enfermeiro: "Enfermeiro",
  jornalista: "Jornalista",
  procurador_juridico: "Procurador Jurídico",
  programador_computador: "Programador de Computador",
  redator: "Redator",
  taquigrafo_i: "Taquígrafo I",
  taquigrafo_ii: "Taquígrafo II",
  tecnico_administrativo: "Técnico Administrativo",
  tecnico_suporte_informatica: "Técnico de Suporte em Informática"
};

export const careerData: { [key: string]: { [band: string]: number } } = {
  auxiliar_de_seguranca: {
    'I': 2869.21, 'II': 3014.09, 'III': 3164.75, 'IV': 3323.08, 'V': 3489.13, 'VI': 3663.71,
    'VII': 3846.83, 'VIII': 4039.19, 'IX': 4241.14, 'X': 4453.17, 'XI': 4675.84, 'XII': 4909.60,
    'XIII': 5155.11, 'XIV': 5412.83, 'XV': 5683.50, 'XVI': 5967.66, 'XVII': 6266.11, 'XVIII': 6579.41,
    'XIX': 6908.29, 'XX': 7253.85, 'XXI': 7616.39, 'XXII': 7997.23, 'XXIII': 8397.15, 'XXIV': 8816.98,
    'XXV': 9257.74, 'XXVI': 9720.72, 'XXVII': 10206.69, 'XXVIII': 10717.01, 'XXIX': 11252.84, 'XXX': 11815.49,
    'XXXI': 12406.35, 'XXXII': 13026.61, 'XXXIII': 13677.95, 'XXXIV': 14361.91, 'XXXV': 15079.95, 'XXXVI': 15833.99
  },
  assistente_administrativo: {
    'I': 2946.70, 'II': 3094.02, 'III': 3248.75, 'IV': 3411.23, 'V': 3581.68, 'VI': 3760.83,
    'VII': 3948.81, 'VIII': 4146.36, 'IX': 4354.34, 'X': 4571.36, 'XI': 4799.82, 'XII': 5039.80,
    'XIII': 5291.83, 'XIV': 5556.48, 'XV': 5834.23, 'XVI': 6125.88, 'XVII': 6432.39, 'XVIII': 6753.89,
    'XIX': 7091.63, 'XX': 7446.14, 'XXI': 7818.49, 'XXII': 8209.41, 'XXIII': 8619.84, 'XXIV': 9050.84,
    'XXV': 9503.46, 'XXVI': 9978.65, 'XXVII': 10477.50, 'XXVIII': 11001.43, 'XXIX': 11551.48, 'XXX': 12129.09,
    'XXXI': 12735.51, 'XXXII': 13372.33, 'XXXIII': 14040.89, 'XXXIV': 14742.96, 'XXXV': 15480.05, 'XXXVI': 16254.12
  },
  tecnico_administrativo: {
    'I': 3300.82, 'II': 3465.89, 'III': 3639.19, 'IV': 3821.15, 'V': 4012.20, 'VI': 4212.84,
    'VII': 4423.42, 'VIII': 4644.62, 'IX': 4876.91, 'X': 5120.70, 'XI': 5376.77, 'XII': 5645.55,
    'XIII': 5927.85, 'XIV': 6224.23, 'XV': 6535.42, 'XVI': 6862.21, 'XVII': 7205.31, 'XVIII': 7565.66,
    'XIX': 7943.90, 'XX': 8341.07, 'XXI': 8758.16, 'XXII': 9196.00, 'XXIII': 9655.90, 'XXIV': 10138.57,
    'XXV': 10646.51, 'XXVI': 11177.93, 'XXVII': 11736.68, 'XXVIII': 12323.57, 'XXIX': 12939.72, 'XXX': 13586.68,
    'XXXI': 14266.03, 'XXXII': 14979.29, 'XXXIII': 15728.32, 'XXXIV': 16514.73, 'XXXV': 17340.44, 'XXXVI': 18207.49
  },
  taquigrafo_i: {
    'I': 3465.89, 'II': 3639.19, 'III': 3821.15, 'IV': 4012.20, 'V': 4212.84, 'VI': 4423.42,
    'VII': 4644.62, 'VIII': 4876.91, 'IX': 5120.70, 'X': 5376.77, 'XI': 5646.26, 'XII': 5927.85,
    'XIII': 6224.23, 'XIV': 6535.42, 'XV': 6862.21, 'XVI': 7205.31, 'XVII': 7565.66, 'XVIII': 7943.90,
    'XIX': 8342.06, 'XX': 8759.13, 'XXI': 9197.09, 'XXII': 9656.96, 'XXIII': 10139.81, 'XXIV': 10646.81,
    'XXV': 11179.13, 'XXVI': 11738.09, 'XXVII': 12324.96, 'XXVIII': 12941.13, 'XXIX': 13588.24, 'XXX': 14267.57,
    'XXXI': 14980.98, 'XXXII': 15730.04, 'XXXIII': 16516.52, 'XXXIV': 17342.36, 'XXXV': 18209.43, 'XXXVI': 19117.90
  },
  tecnico_suporte_informatica: {
    'I': 3465.89, 'II': 3639.19, 'III': 3821.15, 'IV': 4012.20, 'V': 4212.84, 'VI': 4423.42,
    'VII': 4644.62, 'VIII': 4876.91, 'IX': 5120.70, 'X': 5376.77, 'XI': 5646.26, 'XII': 5927.85,
    'XIII': 6224.23, 'XIV': 6535.42, 'XV': 6862.21, 'XVI': 7205.31, 'XVII': 7566.49, 'XVIII': 7943.90,
    'XIX': 8342.06, 'XX': 8759.13, 'XXI': 9197.09, 'XXII': 9656.96, 'XXIII': 10139.81, 'XXIV': 10646.81,
    'XXV': 11179.13, 'XXVI': 11738.09, 'XXVII': 12324.96, 'XXVIII': 12941.13, 'XXIX': 13588.24, 'XXX': 14267.57,
    'XXXI': 14980.98, 'XXXII': 15730.04, 'XXXIII': 16516.52, 'XXXIV': 17342.36, 'XXXV': 18209.43, 'XXXVI': 19117.90
  },
  programador_computador: {
    'I': 4605.70, 'II': 4836.01, 'III': 5077.77, 'IV': 5331.65, 'V': 5598.17, 'VI': 5878.06,
    'VII': 6172.00, 'VIII': 6480.65, 'IX': 6804.57, 'X': 7144.87, 'XI': 7502.09, 'XII': 7877.16,
    'XIII': 8271.03, 'XIV': 8684.63, 'XV': 9118.89, 'XVI': 9574.78, 'XVII': 10053.49, 'XVIII': 10556.21,
    'XIX': 11084.07, 'XX': 11638.16, 'XXI': 12222.18, 'XXII': 12831.09, 'XXIII': 13472.69, 'XXIV': 14146.33,
    'XXV': 14853.60, 'XXVI': 15596.40, 'XXVII': 16376.19, 'XXVIII': 17194.88, 'XXIX': 18054.70, 'XXX': 18957.63,
    'XXXI': 19905.50, 'XXXII': 20900.76, 'XXXIII': 21945.77, 'XXXIV': 23043.06, 'XXXV': 24195.24, 'XXXVI': 25405.03
  },
  jornalista: {
    'I': 5015.91, 'II': 5266.72, 'III': 5530.04, 'IV': 5806.54, 'V': 6096.90, 'VI': 6401.75,
    'VII': 6721.79, 'VIII': 7057.92, 'IX': 7410.78, 'X': 7781.25, 'XI': 8170.34, 'XII': 8579.63,
    'XIII': 9008.61, 'XIV': 9459.04, 'XV': 9931.14, 'XVI': 10427.72, 'XVII': 10949.08, 'XVIII': 11496.49,
    'XIX': 12071.27, 'XX': 12674.89, 'XXI': 13308.63, 'XXII': 13974.10, 'XXIII': 14672.79, 'XXIV': 15406.38,
    'XXV': 16178.17, 'XXVI': 16985.52, 'XXVII': 17834.88, 'XXVIII': 18726.73, 'XXIX': 19663.02, 'XXX': 20646.20,
    'XXXI': 21678.52, 'XXXII': 22762.44, 'XXXIII': 23900.59, 'XXXIV': 25095.58, 'XXXV': 26350.38, 'XXXVI': 27667.87
  },
  assistente_social: {
    'I': 5266.72, 'II': 5530.04, 'III': 5806.54, 'IV': 6096.90, 'V': 6401.75, 'VI': 6721.79,
    'VII': 7057.92, 'VIII': 7410.78, 'IX': 7781.25, 'X': 8170.34, 'XI': 8579.63, 'XII': 9008.61,
    'XIII': 9458.24, 'XIV': 9931.14, 'XV': 10428.59, 'XVI': 10950.02, 'XVII': 11497.52, 'XVIII': 12072.40,
    'XIX': 12676.01, 'XX': 13309.82, 'XXI': 13975.31, 'XXII': 14674.07, 'XXIII': 15407.78, 'XXIV': 16178.17,
    'XXV': 16987.07, 'XXVI': 17836.43, 'XXVII': 18728.25, 'XXVIII': 19664.66, 'XXIX': 20646.20, 'XXX': 21678.52,
    'XXXI': 22762.44, 'XXXII': 23902.52, 'XXXIII': 25097.64, 'XXXIV': 26352.53, 'XXXV': 27670.16, 'XXXVI': 29051.26
  },
  analista_adm_rh: {
    'I': 5603.34, 'II': 5883.51, 'III': 6177.68, 'IV': 6486.55, 'V': 6810.82, 'VI': 7151.40,
    'VII': 7509.03, 'VIII': 7884.49, 'IX': 8278.71, 'X': 8692.65, 'XI': 9127.22, 'XII': 9584.97,
    'XIII': 10064.22, 'XIV': 10567.43, 'XV': 11094.18, 'XVI': 11648.97, 'XVII': 12231.37, 'XVIII': 12842.96,
    'XIX': 13485.07, 'XX': 14159.32, 'XXI': 14867.35, 'XXII': 15610.71, 'XXIII': 16391.24, 'XXIV': 17210.77,
    'XXV': 18071.33, 'XXVI': 18974.90, 'XXVII': 19923.68, 'XXVIII': 20919.84, 'XXIX': 21965.88, 'XXX': 23064.16,
    'XXXI': 24217.39, 'XXXII': 25428.26, 'XXXIII': 26699.77, 'XXXIV': 28034.61, 'XXXV': 29436.43, 'XXXVI': 30908.16
  },
  analista_comissoes: {
    'I': 5603.34, 'II': 5883.51, 'III': 6177.68, 'IV': 6486.55, 'V': 6810.82, 'VI': 7151.40,
    'VII': 7509.03, 'VIII': 7884.49, 'IX': 8278.71, 'X': 8692.65, 'XI': 9127.22, 'XII': 9584.97,
    'XIII': 10064.22, 'XIV': 10567.43, 'XV': 11094.18, 'XVI': 11648.97, 'XVII': 12231.37, 'XVIII': 12842.96,
    'XIX': 13485.07, 'XX': 14159.32, 'XXI': 14867.35, 'XXII': 15610.71, 'XXIII': 16391.24, 'XXIV': 17210.77,
    'XXV': 18071.33, 'XXVI': 18974.90, 'XXVII': 19923.68, 'XXVIII': 20919.84, 'XXIX': 21965.88, 'XXX': 23064.16,
    'XXXI': 24217.39, 'XXXII': 25428.26, 'XXXIII': 26699.77, 'XXXIV': 28034.61, 'XXXV': 29436.43, 'XXXVI': 30908.16
  },
  analista_economico: {
    'I': 5603.34, 'II': 5883.51, 'III': 6177.68, 'IV': 6486.55, 'V': 6810.82, 'VI': 7151.40,
    'VII': 7510.08, 'VIII': 7884.49, 'IX': 8278.71, 'X': 8692.65, 'XI': 9128.54, 'XII': 9584.97,
    'XIII': 10064.22, 'XIV': 10567.43, 'XV': 11094.18, 'XVI': 11648.97, 'XVII': 12231.37, 'XVIII': 12842.96,
    'XIX': 13485.07, 'XX': 14159.32, 'XXI': 14867.35, 'XXII': 15610.71, 'XXIII': 16391.24, 'XXIV': 17210.77,
    'XXV': 18071.33, 'XXVI': 18974.90, 'XXVII': 19923.68, 'XXVIII': 20919.84, 'XXIX': 21965.88, 'XXX': 23064.16,
    'XXXI': 24217.39, 'XXXII': 25428.26, 'XXXIII': 26699.77, 'XXXIV': 28034.61, 'XXXV': 29436.43, 'XXXVI': 30912.50
  },
  analista_legislativo: {
    'I': 5603.34, 'II': 5883.51, 'III': 6177.68, 'IV': 6486.55, 'V': 6810.82, 'VI': 7151.40,
    'VII': 7509.03, 'VIII': 7884.49, 'IX': 8278.71, 'X': 8692.65, 'XI': 9128.54, 'XII': 9584.97,
    'XIII': 10064.22, 'XIV': 10567.43, 'XV': 11094.18, 'XVI': 11648.97, 'XVII': 12231.37, 'XVIII': 12842.96,
    'XIX': 13485.07, 'XX': 14159.32, 'XXI': 14867.35, 'XXII': 15610.71, 'XXIII': 16391.24, 'XXIV': 17210.77,
    'XXV': 18071.33, 'XXVI': 18974.90, 'XXVII': 19923.68, 'XXVIII': 20919.84, 'XXIX': 21965.88, 'XXX': 23064.16,
    'XXXI': 24217.39, 'XXXII': 25428.26, 'XXXIII': 26699.77, 'XXXIV': 28034.61, 'XXXV': 29436.43, 'XXXVI': 30908.16
  },
  bibliotecario: {
    'I': 5327.89, 'II': 5594.29, 'III': 5873.99, 'IV': 6167.68, 'V': 6476.01, 'VI': 6799.85,
    'VII': 7139.90, 'VIII': 7496.90, 'IX': 7871.74, 'X': 8265.33, 'XI': 8678.54, 'XII': 9112.50,
    'XIII': 9568.11, 'XIV': 10046.56, 'XV': 10548.81, 'XVI': 11076.32, 'XVII': 11630.09, 'XVIII': 12211.62,
    'XIX': 12822.16, 'XX': 13463.27, 'XXI': 14136.49, 'XXII': 14843.31, 'XXIII': 15585.47, 'XXIV': 16364.71,
    'XXV': 17182.97, 'XXVI': 18042.12, 'XXVII': 18944.26, 'XXVIII': 19891.45, 'XXIX': 20886.07, 'XXX': 21930.36,
    'XXXI': 23026.90, 'XXXII': 24178.24, 'XXXIII': 25387.25, 'XXXIV': 26656.47, 'XXXV': 27989.38, 'XXXVI': 29388.76
  },
  contador: {
    'I': 5603.34, 'II': 5883.51, 'III': 6177.68, 'IV': 6486.55, 'V': 6810.82, 'VI': 7151.40,
    'VII': 7509.03, 'VIII': 7884.49, 'IX': 8278.71, 'X': 8692.65, 'XI': 9127.22, 'XII': 9584.97,
    'XIII': 10064.22, 'XIV': 10567.43, 'XV': 11094.18, 'XVI': 11648.97, 'XVII': 12231.37, 'XVIII': 12842.96,
    'XIX': 13485.07, 'XX': 14159.32, 'XXI': 14867.35, 'XXII': 15610.71, 'XXIII': 16391.24, 'XXIV': 17210.77,
    'XXV': 18071.33, 'XXVI': 18974.90, 'XXVII': 19923.68, 'XXVIII': 20919.84, 'XXIX': 21965.88, 'XXX': 23064.16,
    'XXXI': 24217.39, 'XXXII': 25428.26, 'XXXIII': 26699.77, 'XXXIV': 28034.61, 'XXXV': 29436.43, 'XXXVI': 30908.16
  },
  enfermeiro: {
    'I': 5603.34, 'II': 5883.51, 'III': 6177.68, 'IV': 6486.55, 'V': 6810.82, 'VI': 7151.40,
    'VII': 7509.03, 'VIII': 7884.49, 'IX': 8278.71, 'X': 8692.65, 'XI': 9127.22, 'XII': 9584.97,
    'XIII': 10064.22, 'XIV': 10567.43, 'XV': 11094.18, 'XVI': 11648.97, 'XVII': 12231.37, 'XVIII': 12842.96,
    'XIX': 13485.07, 'XX': 14159.32, 'XXI': 14867.35, 'XXII': 15610.71, 'XXIII': 16391.24, 'XXIV': 17210.77,
    'XXV': 18071.33, 'XXVI': 18974.90, 'XXVII': 19923.68, 'XXVIII': 20919.84, 'XXIX': 21965.88, 'XXX': 23064.16,
    'XXXI': 24217.39, 'XXXII': 25428.26, 'XXXIII': 26699.77, 'XXXIV': 28034.61, 'XXXV': 29436.43, 'XXXVI': 30908.16
  },
  procurador_juridico: {
    'I': 6656.95, 'II': 6989.79, 'III': 7339.26, 'IV': 7706.22, 'V': 8091.42, 'VI': 8496.11,
    'VII': 8920.90, 'VIII': 9367.03, 'IX': 9835.21, 'X': 10327.03, 'XI': 10843.31, 'XII': 11385.60,
    'XIII': 11954.81, 'XIV': 12552.60, 'XV': 13180.28, 'XVI': 13839.19, 'XVII': 14531.29, 'XVIII': 15257.67,
    'XIX': 16020.61, 'XX': 16821.66, 'XXI': 17662.73, 'XXII': 18545.85, 'XXIII': 16391.24, 'XXIV': 17210.77,
    'XXV': 18071.33, 'XXVI': 18974.90, 'XXVII': 19923.68, 'XXVIII': 20919.84, 'XXIX': 21965.88, 'XXX': 23064.16,
    'XXXI': 24217.39, 'XXXII': 25428.26, 'XXXIII': 26699.77, 'XXXIV': 28034.61, 'XXXV': 29436.43, 'XXXVI': 30908.16
  },
  redator: {
    'I': 5603.34, 'II': 5883.51, 'III': 6177.68, 'IV': 6486.55, 'V': 6810.82, 'VI': 7151.40,
    'VII': 7509.03, 'VIII': 7884.49, 'IX': 8278.71, 'X': 8692.65, 'XI': 9127.22, 'XII': 9584.97,
    'XIII': 10064.22, 'XIV': 10567.43, 'XV': 11094.18, 'XVI': 11648.97, 'XVII': 12231.37, 'XVIII': 12842.96,
    'XIX': 13485.07, 'XX': 14159.32, 'XXI': 14867.35, 'XXII': 15610.71, 'XXIII': 16391.24, 'XXIV': 17210.77,
    'XXV': 18071.33, 'XXVI': 18974.90, 'XXVII': 19923.68, 'XXVIII': 20919.84, 'XXIX': 21965.88, 'XXX': 23064.16,
    'XXXI': 24217.39, 'XXXII': 25428.26, 'XXXIII': 26699.77, 'XXXIV': 28034.61, 'XXXV': 29436.43, 'XXXVI': 30908.16
  },
  taquigrafo_ii: {
    'I': 5327.89, 'II': 5594.29, 'III': 5873.99, 'IV': 6167.68, 'V': 6476.01, 'VI': 6799.85,
    'VII': 7139.90, 'VIII': 7496.90, 'IX': 7871.74, 'X': 8265.33, 'XI': 8678.54, 'XII': 9112.50,
    'XIII': 9568.11, 'XIV': 10046.56, 'XV': 10548.81, 'XVI': 11076.32, 'XVII': 11630.09, 'XVIII': 12211.62,
    'XIX': 12822.16, 'XX': 13463.27, 'XXI': 14136.49, 'XXII': 14843.31, 'XXIII': 15585.47, 'XXIV': 16364.71,
    'XXV': 17182.97, 'XXVI': 18042.12, 'XXVII': 18944.26, 'XXVIII': 19891.45, 'XXIX': 20886.07, 'XXX': 21930.36,
    'XXXI': 23026.90, 'XXXII': 24178.24, 'XXXIII': 25387.25, 'XXXIV': 26656.47, 'XXXV': 27989.38, 'XXXVI': 29388.76
  },
  analista_sistemas: {
    'I': 6656.95, 'II': 6989.79, 'III': 7339.26, 'IV': 7706.22, 'V': 8091.42, 'VI': 8496.11,
    'VII': 8920.90, 'VIII': 9367.03, 'IX': 9835.21, 'X': 10327.03, 'XI': 10843.31, 'XII': 11385.60,
    'XIII': 11954.81, 'XIV': 12552.60, 'XV': 13180.28, 'XVI': 13839.19, 'XVII': 14531.29, 'XVIII': 15257.67,
    'XIX': 16020.61, 'XX': 16821.66, 'XXI': 17662.73, 'XXII': 18545.85, 'XXIII': 19473.14, 'XXIV': 20446.80,
    'XXV': 21469.18, 'XXVI': 22542.62, 'XXVII': 23669.70, 'XXVIII': 24853.28, 'XXIX': 26095.83, 'XXX': 27400.75,
    'XXXI': 28770.81, 'XXXII': 30209.38, 'XXXIII': 31719.80, 'XXXIV': 33305.82, 'XXXV': 34971.10, 'XXXVI': 36719.70
  }
};
