import React from 'react';

const ForecastCard = ({ prediction, formData }) => {
    if (!prediction) return null;

    const { predicted_unbillable_expenditure, main_driver } = prediction;
    const { rent, software_costs } = formData;

    const totalFixedCosts = parseFloat(rent || 0) + parseFloat(software_costs || 0);
    const threshold = totalFixedCosts * 0.20;
    const isOverThreshold = predicted_unbillable_expenditure > threshold;

    return (
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100 flex flex-col justify-center items-center text-center h-full">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Forecast Result</h2>
            <div className="my-4">
                <span className="text-gray-500 uppercase text-xs tracking-wider">Predicted Unbillable Expenditure</span>
                <div className={`text-4xl font-bold mt-2 ${isOverThreshold ? 'text-red-600' : 'text-green-600'}`}>
                    {predicted_unbillable_expenditure.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                </div>
                {main_driver && (
                    <div className="mt-2 text-sm font-medium px-3 py-1 bg-gray-100 rounded-full text-gray-600 inline-block">
                        {main_driver}
                    </div>
                )}
            </div>

            <div className="w-full bg-gray-100 rounded-full h-2.5 mt-2 mb-1">
                <div
                    className={`h-2.5 rounded-full ${isOverThreshold ? 'bg-red-500' : 'bg-green-500'}`}
                    style={{ width: `${Math.min((predicted_unbillable_expenditure / totalFixedCosts) * 100, 100)}%` }}
                ></div>
            </div>

            {/* Driver Analysis Section - NEW */}
            <div className="w-full mt-4 text-left bg-blue-50 p-3 rounded-md border border-blue-100">
                <h4 className="text-xs font-bold text-blue-800 uppercase tracking-wide mb-1">Driver Analysis</h4>
                <p className="text-sm text-blue-900">
                    The primary factor influencing this prediction is <span className="font-bold">{main_driver || 'Operational Factors'}</span>.
                </p>
            </div>

            {isOverThreshold ? (
                <p className="text-red-500 text-sm mt-4 font-medium">⚠️ Alert: Unbillable costs exceed 20% of fixed overhead.</p>
            ) : (
                <p className="text-green-600 text-sm mt-4 font-medium">✓ Expenditure is within healthy limits.</p>
            )}

            <div className="mt-4 text-xs text-gray-400">
                Fixed Costs Basis: {totalFixedCosts.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })} (20% Threshold: {threshold.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })})
            </div>
        </div>
    );
};

export default ForecastCard;
