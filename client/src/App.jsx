import React, { useState } from 'react';
import InputForm from './components/InputForm';
import ForecastCard from './components/ForecastCard';
import TrendChart from './components/TrendChart';

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
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-800 tracking-tight">CorpPredict <span className="text-gray-400 font-normal">| Unbillable Expenditure</span></h1>
          </div>
          <div className="text-sm text-gray-500">v1.0.0</div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* Left Column: Input */}
          <div className="lg:col-span-4">
            <InputForm
              formData={formData}
              handleChange={handleChange}
              handlePredict={handlePredict}
              isLoading={isLoading}
              onSubmitActual={handleSubmitActual}
            />
            {error && (
              <div className="mt-4 bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded shadow-sm" role="alert">
                <p className="font-bold">Error</p>
                <p>{error}</p>
              </div>
            )}
            {successMsg && (
              <div className="mt-4 bg-green-50 border-l-4 border-green-500 text-green-700 p-4 rounded shadow-sm" role="alert">
                <p className="font-bold">Success</p>
                <p>{successMsg}</p>
              </div>
            )}
          </div>

          {/* Right Column: Results & Visualization */}
          <div className="lg:col-span-8 space-y-8">
            {/* Forecast Card */}
            <div className="h-64">
              {prediction ? (
                <ForecastCard prediction={prediction} formData={formData} />
              ) : (
                <div className="h-full bg-white rounded-lg shadow-sm border border-dashed border-gray-300 flex items-center justify-center text-gray-400 animate-pulse">
                  Enter resource details to generate forecast...
                </div>
              )}
            </div>

            {/* Chart */}
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
              <TrendChart prediction={prediction} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
