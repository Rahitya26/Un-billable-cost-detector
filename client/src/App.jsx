import React, { useState } from 'react';
import InputForm from './components/InputForm';
import ForecastCard from './components/ForecastCard';
import TrendChart from './components/TrendChart';
import SimulationDashboard from './components/SimulationDashboard';

function App() {
  const [formData, setFormData] = useState({
    headcount: '',
    software_costs: '',
    rent: '',
    utilization: '',
    actualUnbillable: ''
  });
  const [prediction, setPrediction] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const handlePredict = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const response = await fetch('http://localhost:5000/api/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          headcount: Number(formData.headcount),
          software_costs: Number(formData.software_costs),
          rent: Number(formData.rent),
          utilization: Number(formData.utilization)
        }),
      });

      if (!response.ok) throw new Error('Prediction failed');

      const data = await response.json();
      setPrediction(data);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitActual = async () => {
    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const response = await fetch('http://localhost:5000/api/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          headcount: Number(formData.headcount),
          software_costs: Number(formData.software_costs),
          rent: Number(formData.rent),
          utilization: Number(formData.utilization),
          actual_unbillable_expenditure: Number(formData.actualUnbillable),
          month_year: new Date().toISOString().slice(0, 10) // Today's date
        })
      });
      if (!response.ok) throw new Error('Failed to save metric');
      setSuccessMsg('Successfully added to training data! Model updated.');
      // Optionally clear actual field
      setFormData(prev => ({ ...prev, actualUnbillable: '' }));
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-indigo-100 selection:text-indigo-700">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-indigo-200 shadow-lg">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800 tracking-tight leading-none">CorpPredict</h1>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest leading-none mt-0.5">Unbillable Expenditure AI</p>
            </div>
          </div>
          <div className="px-3 py-1 bg-slate-100 rounded-full text-xs font-medium text-slate-500">v2.0 Hybrid</div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">

          {/* Left Column: Input */}
          <div className="lg:col-span-4 lg:sticky lg:top-24 space-y-6">
            <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
              <InputForm
                formData={formData}
                handleChange={handleChange}
                handlePredict={handlePredict}
                isLoading={isLoading}
                onSubmitActual={handleSubmitActual}
              />
            </div>
            {error && (
              <div className="animate-fade-in bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-r-lg shadow-sm text-sm">
                <p className="font-bold">Error</p>
                <p>{error}</p>
              </div>
            )}
            {successMsg && (
              <div className="animate-fade-in bg-emerald-50 border-l-4 border-emerald-500 text-emerald-700 p-4 rounded-r-lg shadow-sm text-sm">
                <p className="font-bold">Success</p>
                <p>{successMsg}</p>
              </div>
            )}
          </div>

          {/* Right Column: Results & Visualization */}
          <div className="lg:col-span-8 space-y-6">
            {/* Forecast Card */}
            <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-1 min-h-[300px]">
              {prediction ? (
                <>
                  <ForecastCard prediction={prediction} formData={formData} />
                  <SimulationDashboard prediction={prediction} originalInputs={formData} />
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 p-12 border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/50">
                  <svg className="w-16 h-16 mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                  <p className="text-lg font-medium text-slate-500">Ready to Forecast</p>
                  <p className="text-sm mt-1">Enter your resource details on the left.</p>
                </div>
              )}
            </div>

            {/* Chart */}
            <div className="bg-white p-6 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-slate-800">Trend Analysis</h3>
                <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded">Last 12 Months</span>
              </div>
              <TrendChart prediction={prediction} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
