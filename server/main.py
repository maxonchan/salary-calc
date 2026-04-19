from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Salary Calc API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Welcome to Salary Calc API"}

@app.get("/api/tax-rates")
def get_tax_rates():
    return {
        "country": "Japan",
        "currency": "JPY",
        "social_insurance": {
            "health_insurance": 0.05,       # Approx 5% (Employee part)
            "welfare_pension": 0.0915,     # 9.15% (Employee part)
            "employment_insurance": 0.006,  # 0.6% (Employee part)
        },
        "income_tax": {
            "basic_deduction": 480000,
            "brackets": [
                {"limit": 1949000, "rate": 0.05, "quick_deduction": 0},
                {"limit": 3299000, "rate": 0.10, "quick_deduction": 97500},
                {"limit": 6949000, "rate": 0.20, "quick_deduction": 427500},
                {"limit": 8999000, "rate": 0.23, "quick_deduction": 636000},
                {"limit": 17999000, "rate": 0.33, "quick_deduction": 1536000},
                {"limit": 39999000, "rate": 0.40, "quick_deduction": 2796000},
                {"limit": 999999999999, "rate": 0.45, "quick_deduction": 4796000}
            ]
        },
        "resident_tax": {
            "rate": 0.10  # Standard flat 10%
        },
        "employment_income_deduction": [
            {"limit": 1625000, "multiplier": 0, "constant": 550000},
            {"limit": 1800000, "multiplier": 0.40, "constant": -100000},
            {"limit": 3600000, "multiplier": 0.30, "constant": 80000},
            {"limit": 6600000, "multiplier": 0.20, "constant": 440000},
            {"limit": 8500000, "multiplier": 0.10, "constant": 110000},
            {"limit": 999999999999, "multiplier": 0, "constant": 1950000}
        ]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
