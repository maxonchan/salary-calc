const taxRates = {
  country: "Japan",
  currency: "JPY",
  social_insurance: {
    welfare_pension: 0.0915,
    employment_insurance: 0.006,
    nursing_care_rate: 0.00795,
    child_support_rate: 0.00115,
    health_insurance_prefectures: {
      Hokkaido: 0.05105,
      Aomori: 0.04925,
      Iwate: 0.0492,
      Miyagi: 0.04905,
      Akita: 0.0501,
      Yamagata: 0.0496,
      Fukushima: 0.04845,
      Ibaraki: 0.04885,
      Tochigi: 0.0491,
      Gunma: 0.04895,
      Saitama: 0.0489,
      Chiba: 0.04905,
      Tokyo: 0.0499,
      Kanagawa: 0.0501,
      Niigata: 0.0484,
      Toyama: 0.0482,
      Ishikawa: 0.04925,
      Fukui: 0.0493,
      Yamanashi: 0.049,
      Nagano: 0.0486,
      Gifu: 0.0493,
      Shizuoka: 0.0489,
      Aichi: 0.0499,
      Mie: 0.049,
      Shiga: 0.04915,
      Kyoto: 0.0502,
      Osaka: 0.0517,
      Hyogo: 0.0506,
      Nara: 0.05,
      Wakayama: 0.0501,
      Tottori: 0.04925,
      Shimane: 0.0498,
      Okayama: 0.05045,
      Hiroshima: 0.04945,
      Yamaguchi: 0.05025,
      Tokushima: 0.05045,
      Kagawa: 0.05075,
      Ehime: 0.04935,
      Kochi: 0.05055,
      Fukuoka: 0.05175,
      Saga: 0.05255,
      Nagasaki: 0.05105,
      Kumamoto: 0.0511,
      Oita: 0.05015,
      Miyazaki: 0.0493,
      Kagoshima: 0.05075,
      Okinawa: 0.04955
    }
  },
  income_tax: {
    basic_deduction: 480000,
    spouse_deduction: 380000,
    dependent_deduction: 380000,
    brackets: [
      { limit: 1949000, rate: 0.05, quick_deduction: 0 },
      { limit: 3299000, rate: 0.10, quick_deduction: 97500 },
      { limit: 6949000, rate: 0.20, quick_deduction: 427500 },
      { limit: 8999000, rate: 0.23, quick_deduction: 636000 },
      { limit: 17999000, rate: 0.33, quick_deduction: 1536000 },
      { limit: 39999000, rate: 0.40, quick_deduction: 2796000 },
      { limit: 999999999999, rate: 0.45, quick_deduction: 4796000 }
    ]
  },
  resident_tax: {
    rate: 0.10,
    basic_deduction: 430000
  },
  employment_income_deduction: [
    { limit: 1625000, multiplier: 0, constant: 550000 },
    { limit: 1800000, multiplier: 0.40, constant: -100000 },
    { limit: 3600000, multiplier: 0.30, constant: 80000 },
    { limit: 6600000, multiplier: 0.20, constant: 440000 },
    { limit: 8500000, multiplier: 0.10, constant: 110000 },
    { limit: 999999999999, multiplier: 0, constant: 1950000 }
  ]
};

export default taxRates;
