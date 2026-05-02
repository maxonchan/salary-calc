import { useState, useEffect, useMemo } from 'react'

function App() {
  const [salary, setSalary] = useState('')
  const [transportation, setTransportation] = useState('')
  const [prevYearIncome, setPrevYearIncome] = useState('') // New state
  const [age, setAge] = useState(30)
  const [prefecture, setPrefecture] = useState('Tokyo')
  const [hasSpouse, setHasSpouse] = useState(false)
  const [dependents, setDependents] = useState(0)
  const [includeChildSupport, setIncludeChildSupport] = useState(false)
  const [useLegacyEmploymentRate, setUseLegacyEmploymentRate] = useState(false)
  const [rates, setRates] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('http://localhost:8000/api/tax-rates')
      .then(res => res.json())
      .then(data => {
        setRates(data)
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to fetch rates', err)
        setLoading(false)
      })
  }, [])

  // Helper to get Standard Monthly Remuneration (標準報酬月額)
  const getSMR = (totalMonthly) => {
    if (totalMonthly < 63000) return 58000
    if (totalMonthly >= 1355000) return 1390000
    const brackets = [
      { min: 0, max: 63000, smr: 58000 },
      { min: 63000, max: 73000, smr: 68000 },
      { min: 73000, max: 83000, smr: 78000 },
      { min: 83000, max: 93000, smr: 88000 },
      { min: 93000, max: 101000, smr: 98000 },
      { min: 101000, max: 107000, smr: 104000 },
      { min: 107000, max: 114000, smr: 110000 },
      { min: 114000, max: 122000, smr: 118000 },
      { min: 122000, max: 130000, smr: 126000 },
      { min: 130000, max: 138000, smr: 134000 },
      { min: 138000, max: 146000, smr: 142000 },
      { min: 146000, max: 155000, smr: 150000 },
      { min: 155000, max: 165000, smr: 160000 },
      { min: 165000, max: 175000, smr: 170000 },
      { min: 175000, max: 185000, smr: 180000 },
      { min: 185000, max: 195000, smr: 190000 },
      { min: 195000, max: 210000, smr: 200000 },
      { min: 210000, max: 230000, smr: 220000 },
      { min: 230000, max: 250000, smr: 240000 },
      { min: 250000, max: 270000, smr: 260000 },
      { min: 270000, max: 290000, smr: 280000 },
      { min: 290000, max: 310000, smr: 300000 },
      { min: 310000, max: 330000, smr: 320000 },
      { min: 330000, max: 350000, smr: 340000 },
      { min: 350000, max: 370000, smr: 360000 },
      { min: 370000, max: 395000, smr: 380000 },
      { min: 395000, max: 425000, smr: 410000 },
      { min: 425000, max: 455000, smr: 440000 },
      { min: 455000, max: 485000, smr: 470000 },
      { min: 485000, max: 515000, smr: 500000 },
      { min: 515000, max: 545000, smr: 530000 },
      { min: 545000, max: 575000, smr: 560000 },
      { min: 575000, max: 605000, smr: 590000 },
      { min: 605000, max: 635000, smr: 620000 },
    ]
    const found = brackets.find(b => totalMonthly >= b.min && totalMonthly < b.max)
    return found ? found.smr : 620000
  }

  // Monthly Withholding Tax Table 2024 (Kou-ran)
  const calculateMonthlyIncomeTax = (taxableMonthly, dependentsCount) => {
    if (taxableMonthly < 88000) return 0
    const base = taxableMonthly
    let tax = 0
    const effectiveTaxable = Math.max(0, base - (dependentsCount * 40000))
    if (effectiveTaxable < 88000) return 0
    if (effectiveTaxable < 100000) tax = (effectiveTaxable - 88000) * 0.05
    else if (effectiveTaxable < 200000) tax = 1000 + (effectiveTaxable - 113000) * 0.05
    else if (effectiveTaxable < 300000) tax = 5000 + (effectiveTaxable - 210000) * 0.06
    else if (effectiveTaxable < 400000) tax = 10750 + (effectiveTaxable - 340293) * 0.10
    else tax = 17000 + (effectiveTaxable - 400000) * 0.20
    return Math.max(0, tax)
  }

  // Resident Tax Calculation Helper
  const calculateAnnualResidentTax = (annualIncome, socialInsuranceAnnual, hasSpouse, dependentsCount) => {
    if (annualIncome <= 0) return 0
    
    // 1. Employment Income Deduction
    let empDeduction = 0
    for (const bracket of rates.employment_income_deduction) {
      if (annualIncome <= bracket.limit) {
        empDeduction = annualIncome * bracket.multiplier + bracket.constant
        break
      }
    }
    
    // 2. Taxable Base
    // Using Resident Tax specific deductions (approx)
    const basicDeduction = rates.resident_tax.basic_deduction // 430,000
    const spouseDeduction = hasSpouse ? 330000 : 0
    const dependentDeduction = dependentsCount * 330000
    
    const taxableBase = Math.max(0, annualIncome - socialInsuranceAnnual - empDeduction - basicDeduction - spouseDeduction - dependentDeduction)
    
    // 3. Income-based part (10%) + Per-capita part (approx 5000)
    return (taxableBase * rates.resident_tax.rate) + 5000
  }

  const calculation = useMemo(() => {
    if (!salary || !rates) return null

    const monthlyBase = parseFloat(salary) || 0
    const monthlyTransport = parseFloat(transportation) || 0
    const monthlyGross = monthlyBase + monthlyTransport
    const currentAnnualGross = monthlyBase * 12 // Use base salary for annual tax projections

    // 1. Social Insurance
    const smr = getSMR(monthlyGross)
    const healthRate = rates.social_insurance.health_insurance_prefectures[prefecture] || 0.05
    const nursingRate = (age >= 40 && age <= 64) ? rates.social_insurance.nursing_care_rate : 0
    const childSupportRate = includeChildSupport ? rates.social_insurance.child_support_rate : 0
    const monthlyHealth = smr * healthRate
    const monthlyNursing = smr * nursingRate
    const monthlyPension = smr * rates.social_insurance.welfare_pension
    const monthlyChildSupport = smr * childSupportRate
    const employmentRate = useLegacyEmploymentRate ? 0.005 : rates.social_insurance.employment_insurance
    const monthlyUnemployment = monthlyGross * employmentRate
    
    const monthlySocialTotal = monthlyHealth + monthlyNursing + monthlyPension + monthlyUnemployment + monthlyChildSupport
    const annualSocialTotal = monthlySocialTotal * 12

    // 2. Monthly Income Tax (Based on CURRENT month)
    const taxableForIncomeTax = monthlyBase - (monthlyHealth + monthlyNursing + monthlyPension + monthlyUnemployment)
    const monthlyNationalTax = calculateMonthlyIncomeTax(taxableForIncomeTax, dependents + (hasSpouse ? 1 : 0))

    // 3. Resident Tax
    // A) CURRENT Deduction (based on PREVIOUS YEAR income)
    const prevIncome = parseFloat(prevYearIncome) || 0
    // Estimate prev year's social insurance as approx 15% if not provided, 
    // or just use current social insurance ratio as an approximation
    const prevSocialInsurance = prevIncome * (monthlySocialTotal / monthlyGross)
    const currentMonthlyResidentTax = calculateAnnualResidentTax(prevIncome, prevSocialInsurance, hasSpouse, dependents) / 12

    // B) PROJECTED Deduction (based on THIS YEAR income - for "Next Year Warning")
    const projectedMonthlyResidentTax = calculateAnnualResidentTax(currentAnnualGross, annualSocialTotal, hasSpouse, dependents) / 12

    const currentMonthlyTaxTotal = monthlyNationalTax + currentMonthlyResidentTax
    const currentNetMonthly = monthlyBase - monthlySocialTotal - monthlyNationalTax - currentMonthlyResidentTax

    return {
      monthlyGross: monthlyBase,
      monthlyTransport,
      monthlySocialTotal,
      monthlyHealth,
      monthlyNursing,
      monthlyPension,
      monthlyUnemployment,
      monthlyChildSupport,
      currentMonthlyTaxTotal,
      nationalTax: monthlyNationalTax,
      residentTax: currentMonthlyResidentTax,
      projectedResidentTax: projectedMonthlyResidentTax,
      netMonthly: currentNetMonthly,
      projectedNetMonthly: monthlyBase - monthlySocialTotal - monthlyNationalTax - projectedMonthlyResidentTax,
      annualGross: currentAnnualGross,
      annualNet: currentNetMonthly * 12,
      smr,
      employmentRate
    }
  }, [salary, transportation, prevYearIncome, rates, age, prefecture, hasSpouse, dependents, includeChildSupport, useLegacyEmploymentRate])

  const prefectureMapping = {
    "Hokkaido": "北海道", "Aomori": "青森県", "Iwate": "岩手県", "Miyagi": "宮城県",
    "Akita": "秋田県", "Yamagata": "山形県", "Fukushima": "福島県", "Ibaraki": "茨城県",
    "Tochigi": "栃木県", "Gunma": "群馬県", "Saitama": "埼玉県", "Chiba": "千葉県",
    "Tokyo": "東京都", "Kanagawa": "神奈川県", "Niigata": "新潟県", "Toyama": "富山県",
    "Ishikawa": "石川県", "Fukui": "福井県", "Yamanashi": "山梨県", "Nagano": "長野県",
    "Gifu": "岐阜県", "Shizuoka": "静岡県", "Aichi": "愛知県", "Mie": "三重県",
    "Shiga": "滋賀県", "Kyoto": "京都府", "Osaka": "大阪府", "Hyogo": "兵庫県",
    "Nara": "奈良県", "Wakayama": "和歌山県", "Tottori": "鳥取県", "Shimane": "島根県",
    "Okayama": "岡山県", "Hiroshima": "広島県", "Yamaguchi": "山口県", "Tokushima": "徳島県",
    "Kagawa": "香川県", "Ehime": "愛媛県", "Kochi": "高知県", "Fukuoka": "福岡県",
    "Saga": "佐賀県", "Nagasaki": "長崎県", "Kumamoto": "熊本県", "Oita": "大分県",
    "Miyazaki": "宮崎県", "Kagoshima": "鹿児島県", "Okinawa": "沖縄県"
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-emerald-400">
        <div className="animate-pulse text-2xl font-mono tracking-widest">LOADING RATES...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 selection:bg-emerald-500/30">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full"></div>
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-emerald-600/10 blur-[120px] rounded-full"></div>
      </div>

      <div className="max-w-4xl w-full relative">
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-2xl p-8 md:p-10 transition-all duration-300">
          <header className="mb-10 text-center">
            <h1 className="text-4xl font-black mb-2 bg-gradient-to-r from-blue-400 via-emerald-400 to-blue-400 bg-[length:200%_auto] animate-gradient-x bg-clip-text text-transparent">
              SalaryCalc.jp
            </h1>
            <p className="text-slate-400 font-medium">日本給与手取りシミュレーター</p>
          </header>

          <main className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Row 1: Salary & Transportation */}
              <div className="relative group flex flex-col">
                <label htmlFor="salary" className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">
                  Monthly Salary / 月収 (額面)
                </label>
                <div className="relative flex-1">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-slate-600 group-focus-within:text-emerald-400 transition-colors">¥</span>
                  <input
                    type="number"
                    id="salary"
                    value={salary}
                    onChange={(e) => setSalary(e.target.value)}
                    placeholder="300,000"
                    className="w-full h-full bg-slate-950/50 border-2 border-slate-800 focus:border-emerald-500/50 rounded-2xl py-4 pl-12 pr-6 text-2xl font-bold text-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all placeholder:text-slate-700"
                  />
                </div>
              </div>

              <div className="relative group flex flex-col">
                <label htmlFor="transportation" className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">
                  Transportation / 交通費 (非課税)
                </label>
                <div className="relative flex-1">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-slate-600 group-focus-within:text-blue-400 transition-colors">¥</span>
                  <input
                    type="number"
                    id="transportation"
                    value={transportation}
                    onChange={(e) => setTransportation(e.target.value)}
                    placeholder="0"
                    className="w-full h-full bg-slate-950/50 border-2 border-slate-800 focus:border-blue-500/50 rounded-2xl py-4 pl-10 pr-6 text-xl font-bold text-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-700"
                  />
                </div>
              </div>

              {/* Row 2: Prev Year Income & Prefecture */}
              <div className="relative group flex flex-col">
                <label htmlFor="prevYearIncome" className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">
                  Prev. Year Annual Income / 前年年収
                </label>
                <div className="relative flex-1">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-slate-600 group-focus-within:text-purple-400 transition-colors">¥</span>
                  <input
                    type="number"
                    id="prevYearIncome"
                    value={prevYearIncome}
                    onChange={(e) => setPrevYearIncome(e.target.value)}
                    placeholder="0 (First year in Japan)"
                    className="w-full h-full bg-slate-950/50 border-2 border-slate-800 focus:border-purple-500/50 rounded-2xl py-4 pl-10 pr-6 text-xl font-bold text-white focus:outline-none focus:ring-4 focus:ring-purple-500/10 transition-all placeholder:text-slate-700"
                  />
                </div>
              </div>

              <div className="relative group flex flex-col">
                <label htmlFor="prefecture" className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">
                  Prefecture / 都道府県
                </label>
                <select
                  id="prefecture"
                  value={prefecture}
                  onChange={(e) => setPrefecture(e.target.value)}
                  className="flex-1 w-full bg-slate-950/50 border-2 border-slate-800 focus:border-emerald-500/50 rounded-2xl py-4 px-6 text-xl font-bold text-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all appearance-none cursor-pointer"
                >
                  {Object.keys(rates.social_insurance.health_insurance_prefectures)
                    .sort()
                    .map(pref => (
                      <option key={pref} value={pref} className="bg-slate-900">
                        {pref} / {prefectureMapping[pref] || pref}
                      </option>
                  ))}
                </select>
              </div>

              {/* Row 3: Personal Info (Age, Spouse, Dependents) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 md:col-span-2">
                <div className="relative group flex flex-col">
                  <label htmlFor="age" className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">
                    Age / 年齢
                  </label>
                  <input
                    type="number"
                    id="age"
                    value={age}
                    onChange={(e) => setAge(parseInt(e.target.value) || 0)}
                    className="flex-1 w-full bg-slate-950/50 border-2 border-slate-800 focus:border-emerald-500/50 rounded-2xl py-4 px-6 text-xl font-bold text-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all"
                  />
                </div>

                <div className="relative group flex flex-col">
                  <label className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">
                    Spouse / 配偶者
                  </label>
                  <label className="flex-1 flex items-center cursor-pointer bg-slate-950/50 border-2 border-slate-800 rounded-2xl py-4 px-6 focus-within:border-emerald-500/50 transition-all">
                    <input
                      type="checkbox"
                      checked={hasSpouse}
                      onChange={(e) => setHasSpouse(e.target.checked)}
                      className="w-5 h-5 rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 bg-slate-900"
                    />
                    <span className="ml-3 text-sm font-bold text-slate-400">Yes / あり</span>
                  </label>
                </div>

                <div className="relative group flex flex-col">
                  <label htmlFor="dependents" className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">
                    Dependents / 扶養
                  </label>
                  <input
                    type="number"
                    id="dependents"
                    min="0"
                    value={dependents}
                    onChange={(e) => setDependents(parseInt(e.target.value) || 0)}
                    className="flex-1 w-full bg-slate-950/50 border-2 border-slate-800 focus:border-emerald-500/50 rounded-2xl py-4 px-6 text-xl font-bold text-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all"
                  />
                </div>
              </div>

              {/* Row 4: Extra Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:col-span-2">
                <div className="relative group flex flex-col">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3" title="Matches outdated 0.5% rate used by some calculators.">
                    Legacy Unempl. / 旧雇用保険(0.5%)
                  </label>
                  <label className="flex-1 flex items-center cursor-pointer bg-slate-950/50 border-2 border-slate-800 rounded-2xl py-4 px-6 focus-within:border-rose-500/50 transition-all">
                    <input
                      type="checkbox"
                      checked={useLegacyEmploymentRate}
                      onChange={(e) => setUseLegacyEmploymentRate(e.target.checked)}
                      className="w-5 h-5 rounded border-slate-700 text-rose-500 focus:ring-rose-500 bg-slate-900"
                    />
                    <span className="ml-3 text-sm font-bold text-slate-400">Use 0.5%</span>
                  </label>
                </div>
                
                <div className="relative group flex flex-col">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                    Child Support / 子育て支援金
                  </label>
                  <label className="flex-1 flex items-center cursor-pointer bg-slate-950/50 border-2 border-slate-800 rounded-2xl py-4 px-6 focus-within:border-amber-500/50 transition-all">
                    <input
                      type="checkbox"
                      checked={includeChildSupport}
                      onChange={(e) => setIncludeChildSupport(e.target.checked)}
                      className="w-5 h-5 rounded border-slate-700 text-amber-500 focus:ring-amber-500 bg-slate-900"
                    />
                    <span className="ml-3 text-sm font-bold text-slate-400">Include (2026+)</span>
                  </label>
                </div>
              </div>
            </div>

            {calculation ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="space-y-6">
                  <div className="bg-slate-900/50 rounded-3xl p-8 border border-emerald-500/20 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                      <svg className="w-16 h-16 text-emerald-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.82v-1.91c-1.61-.21-3.21-1.03-4.59-2.32l1.39-1.39c1.02.94 2.15 1.55 3.2 1.83v-3.53c-2.03-.51-4.06-1.51-4.06-4.04 0-1.89 1.4-3.46 3.47-3.92V3h2.82v1.9c1.47.16 2.84.82 3.84 1.76l-1.37 1.37c-.77-.66-1.63-1.07-2.47-1.25v3.25c2.25.56 4.39 1.63 4.39 4.31 0 2.11-1.57 3.65-3.8 4.15zm-3.8-10.7c0 .76.62 1.25 1.8 1.58V7.12c-.75.14-1.8.44-1.8 1.27zm3.8 6.43c.96-.21 1.85-.6 1.85-1.53 0-.82-.67-1.34-1.85-1.66v3.19z"/>
                      </svg>
                    </div>
                    <h3 className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-2">Current Take-home / 現在の手取り</h3>
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-black text-white tracking-tighter">¥{Math.round(calculation.netMonthly).toLocaleString()}</span>
                      <span className="text-slate-500 font-bold">/ month</span>
                    </div>
                    
                    {/* Next Year Warning */}
                    <div className="mt-6 pt-4 border-t border-slate-800/50">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Next Year Projection (June+) / 来年6月からの予測</span>
                        <span className={`text-sm font-black ${calculation.projectedResidentTax > calculation.residentTax ? 'text-rose-400' : 'text-emerald-400'}`}>
                          ¥{Math.round(calculation.projectedNetMonthly).toLocaleString()}
                        </span>
                      </div>
                      {calculation.projectedResidentTax > calculation.residentTax && (
                        <div className="mt-2 flex items-start gap-2 bg-rose-500/10 border border-rose-500/20 rounded-xl p-3">
                          <svg className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <p className="text-[10px] text-rose-300 leading-tight">
                            <strong>Resident Tax Warning:</strong> Your resident tax is projected to increase by ¥{Math.round(calculation.projectedResidentTax - calculation.residentTax).toLocaleString()} monthly next year based on your current salary.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-slate-900/30 rounded-3xl p-6 border border-slate-800 space-y-4">
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-tighter mb-2">Deductions Breakdown / 控除明細</h4>
                    
                    <div className="group">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-sm mb-1.5 gap-1">
                        <span className="text-slate-400">Social Insurance / 社会保険</span>
                        <span className="font-bold text-rose-400/90 sm:text-right">- ¥{Math.round(calculation.monthlySocialTotal).toLocaleString()}</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-rose-500/50 rounded-full transition-all duration-700 ease-out"
                          style={{ width: `${(calculation.monthlySocialTotal / calculation.monthlyGross) * 100}%` }}
                        ></div>
                      </div>
                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 px-1">
                        <div className="text-xs text-slate-500">Health / 健康: ¥{Math.round(calculation.monthlyHealth).toLocaleString()}</div>
                        {calculation.monthlyNursing > 0 && (
                          <div className="text-xs text-rose-300">Nursing / 介護: ¥{Math.round(calculation.monthlyNursing).toLocaleString()}</div>
                        )}
                        <div className="text-xs text-slate-500">Pension / 年金: ¥{Math.round(calculation.monthlyPension).toLocaleString()}</div>
                        <div className="text-xs text-slate-500">Unempl / 雇用: ¥{Math.round(calculation.monthlyUnemployment).toLocaleString()}</div>
                        {calculation.monthlyChildSupport > 0 && (
                          <div className="text-xs text-amber-500">Support / 支援金: ¥{Math.round(calculation.monthlyChildSupport).toLocaleString()}</div>
                        )}
                      </div>
                    </div>

                    <div className="group">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-sm mb-1.5 gap-1">
                        <span className="text-slate-400">Income Tax / 税金 (所得税 + 住民税)</span>
                        <span className="font-bold text-amber-400/90 sm:text-right">- ¥{Math.round(calculation.currentMonthlyTaxTotal).toLocaleString()}</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-amber-500/50 rounded-full transition-all duration-700 ease-out"
                          style={{ width: `${(calculation.currentMonthlyTaxTotal / calculation.monthlyGross) * 100}%` }}
                        ></div>
                      </div>
                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 px-1">
                        <div className="text-xs text-slate-500">National (Monthly Table) / 所得税: ¥{Math.round(calculation.nationalTax).toLocaleString()}</div>
                        <div className="text-xs text-slate-500">
                          Resident ({parseFloat(prevYearIncome) > 0 ? 'Current' : 'First Year'}) / 住民税: ¥{Math.round(calculation.residentTax).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-800/50 lg:border-t-0 lg:pt-0">
                  <details className="group" open>
                    <summary className="flex items-center justify-between cursor-pointer list-none text-slate-500 hover:text-emerald-400 transition-colors">
                      <span className="text-xs font-bold uppercase tracking-widest">Calculation Logic & Rates / 計算ロジックと比率</span>
                      <svg className="w-4 h-4 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </summary>
                    <div className="mt-4 space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="bg-slate-950/60 rounded-xl p-5 border border-slate-800/50">
                        <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-4">Formula / 計算式</h4>
                        <div className="font-mono text-xs space-y-2.5 text-slate-300">
                          <p className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            手取り = 額面 - 社会保険料 - 所得税 - 住民税
                          </p>
                          <p className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                            社会保険料 = SMR (¥{calculation.smr.toLocaleString()}) × 保険率
                          </p>
                          <p className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1"></span>
                            所得税 = 月額表 (課税対象額: ¥{Math.round(calculation.monthlyGross - (calculation.monthlySocialTotal - calculation.monthlyChildSupport)).toLocaleString()})
                          </p>
                          <p className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1"></span>
                            住民税(現在) = 前年年収(¥{(parseFloat(prevYearIncome) || 0).toLocaleString()}) × 10% / 12
                          </p>
                        </div>
                      </div>

                      <div className="bg-slate-950/40 rounded-xl p-5 border border-slate-800/30">
                        <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-4">Applied Rates / 適用レート</h4>
                        <div className="grid grid-cols-2 gap-5">
                          <div className="space-y-1">
                            <div className="text-xs text-slate-500 uppercase tracking-wider">Health ({prefecture})</div>
                            <div className="text-sm font-bold text-white">{(rates.social_insurance.health_insurance_prefectures[prefecture] * 100).toFixed(3)}%</div>
                          </div>
                          <div className="space-y-1">
                            <div className="text-xs text-slate-500 uppercase tracking-wider">Pension</div>
                            <div className="text-sm font-bold text-white">{(rates.social_insurance.welfare_pension * 100).toFixed(2)}%</div>
                          </div>
                          <div className="space-y-1">
                            <div className="text-xs text-slate-500 uppercase tracking-wider">Employment</div>
                            <div className="text-sm font-bold text-white">{(calculation.employmentRate * 100).toFixed(2)}%</div>
                          </div>
                          <div className="space-y-1">
                            <div className="text-xs text-slate-500 uppercase tracking-wider">Resident Tax</div>
                            <div className="text-sm font-bold text-white">10.0%</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </details>
                </div>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center bg-slate-900/20 border-2 border-dashed border-slate-800 rounded-3xl space-y-4">
                <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center animate-pulse">
                  <svg className="w-6 h-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="font-medium text-sm text-center px-4 text-slate-500">Enter monthly salary to see results / 月収を入力してください</p>
              </div>
            )}
          </main>

          <footer className="mt-10 pt-6 border-t border-slate-800/50 text-center">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
              Data based on 2024 Japan Tax Reform Standard / 2024年度日本の税制改正基準に基づくデータ
            </p>
          </footer>
        </div>
      </div>
    </div>
  )
}

export default App