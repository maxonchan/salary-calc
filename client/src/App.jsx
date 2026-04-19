import { useState, useEffect, useMemo } from 'react'

function App() {
  const [salary, setSalary] = useState('')
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

  const calculation = useMemo(() => {
    if (!salary || !rates) return null

    const monthlyGross = parseFloat(salary)
    if (isNaN(monthlyGross)) return null

    const annualGross = monthlyGross * 12

    // 1. Social Insurance
    const monthlyHealth = monthlyGross * rates.social_insurance.health_insurance
    const monthlyPension = monthlyGross * rates.social_insurance.welfare_pension
    const monthlyUnemployment = monthlyGross * rates.social_insurance.employment_insurance
    const monthlySocialTotal = monthlyHealth + monthlyPension + monthlyUnemployment
    const annualSocialTotal = monthlySocialTotal * 12

    // 2. Employment Income Deduction (給与所得控除)
    let empDeduction = 0
    for (const bracket of rates.employment_income_deduction) {
      if (annualGross <= bracket.limit) {
        empDeduction = annualGross * bracket.multiplier + bracket.constant
        break
      }
    }

    // 3. Taxable Income
    const taxableBase = Math.max(0, annualGross - annualSocialTotal - empDeduction - rates.income_tax.basic_deduction)

    // 4. National Income Tax (所得税)
    let nationalTax = 0
    for (const bracket of rates.income_tax.brackets) {
      if (taxableBase <= bracket.limit) {
        nationalTax = taxableBase * bracket.rate - bracket.quick_deduction
        break
      }
    }

    // 5. Resident Tax (住民税)
    const residentTax = taxableBase * rates.resident_tax.rate

    const annualTaxTotal = nationalTax + residentTax
    const monthlyTaxTotal = annualTaxTotal / 12
    const netMonthly = monthlyGross - monthlySocialTotal - monthlyTaxTotal

    return {
      monthlyGross,
      monthlySocialTotal,
      monthlyHealth,
      monthlyPension,
      monthlyUnemployment,
      monthlyTaxTotal,
      nationalTax: nationalTax / 12,
      residentTax: residentTax / 12,
      netMonthly,
      annualGross,
      annualNet: netMonthly * 12
    }
  }, [salary, rates])

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

      <div className="max-w-2xl w-full relative">
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-2xl p-8 md:p-10 transition-all duration-300">
          <header className="mb-10 text-center">
            <h1 className="text-4xl font-black mb-2 bg-gradient-to-r from-blue-400 via-emerald-400 to-blue-400 bg-[length:200%_auto] animate-gradient-x bg-clip-text text-transparent">
              SalaryCalc.jp
            </h1>
            <p className="text-slate-400 font-medium">日本給与手取りシミュレーター</p>
          </header>

          <main className="space-y-8">
            <div className="relative group">
              <label htmlFor="salary" className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">
                Monthly Salary (額面)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-slate-600 group-focus-within:text-emerald-400 transition-colors">¥</span>
                <input
                  type="number"
                  id="salary"
                  value={salary}
                  onChange={(e) => setSalary(e.target.value)}
                  placeholder="300,000"
                  className="w-full bg-slate-950/50 border-2 border-slate-800 focus:border-emerald-500/50 rounded-2xl py-4 pl-12 pr-6 text-2xl font-bold text-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all placeholder:text-slate-700"
                />
              </div>
            </div>

            {calculation ? (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-950/40 p-6 rounded-2xl border border-slate-800/50">
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">Take-home (手取り)</p>
                    <p className="text-3xl font-black text-emerald-400">¥{Math.round(calculation.netMonthly).toLocaleString()}</p>
                  </div>
                  <div className="bg-slate-950/40 p-6 rounded-2xl border border-slate-800/50">
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">Annual Take-home</p>
                    <p className="text-3xl font-black text-blue-400">¥{Math.round(calculation.annualNet).toLocaleString()}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-2">Deductions Breakdown</h3>
                  
                  <div className="group">
                    <div className="flex justify-between items-center text-sm mb-1.5">
                      <span className="text-slate-400">Social Insurance (社会保険)</span>
                      <span className="font-bold text-rose-400/90">- ¥{Math.round(calculation.monthlySocialTotal).toLocaleString()}</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-rose-500/50 rounded-full transition-all duration-700 ease-out" 
                        style={{ width: `${(calculation.monthlySocialTotal / calculation.monthlyGross) * 100}%` }}
                      ></div>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2 px-1">
                      <div className="text-[10px] text-slate-500">Health: ¥{Math.round(calculation.monthlyHealth).toLocaleString()}</div>
                      <div className="text-[10px] text-slate-500">Pension: ¥{Math.round(calculation.monthlyPension).toLocaleString()}</div>
                      <div className="text-[10px] text-slate-500">Unempl: ¥{Math.round(calculation.monthlyUnemployment).toLocaleString()}</div>
                    </div>
                  </div>

                  <div className="group">
                    <div className="flex justify-between items-center text-sm mb-1.5">
                      <span className="text-slate-400">Income Tax (所得税 + 住民税)</span>
                      <span className="font-bold text-amber-400/90">- ¥{Math.round(calculation.monthlyTaxTotal).toLocaleString()}</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-amber-500/50 rounded-full transition-all duration-700 ease-out" 
                        style={{ width: `${(calculation.monthlyTaxTotal / calculation.monthlyGross) * 100}%` }}
                      ></div>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 px-1">
                      <div className="text-[10px] text-slate-500">National: ¥{Math.round(calculation.nationalTax).toLocaleString()}</div>
                      <div className="text-[10px] text-slate-500">Resident: ¥{Math.round(calculation.residentTax).toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-slate-600 border-2 border-dashed border-slate-800 rounded-3xl">
                <div className="w-12 h-12 mb-4 rounded-full bg-slate-900 flex items-center justify-center">
                  <span className="text-xl">📊</span>
                </div>
                <p className="font-medium">Enter your salary to see results</p>
              </div>
            )}
          </main>

          <footer className="mt-10 pt-6 border-t border-slate-800/50 text-center">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
              Data based on 2024 Japan Tax Reform Standard
            </p>
          </footer>
        </div>
      </div>
    </div>
  )
}

export default App
