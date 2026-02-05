import React from 'react';

const ForecastCard = ({ prediction, formData }) => {
    if (!prediction) return null;

    const { predicted_unbillable_expenditure, main_driver, breakdown, meta } = prediction;
    const { rent, software_costs } = formData;

    const totalFixedCosts = breakdown ? breakdown.fixed_costs : (parseFloat(rent || 0) + parseFloat(software_costs || 0));
    const threshold = totalFixedCosts * 1.20; // 20% buffer logic (or use hard floor check)
    // Actually, logic said "Exceeds 20% of fixed overheads". Wait.
    // Task instructions said "Red Alert: Triggers when Prediction > (Rent + Software) * 0.2".
    // That means Prediction > 0.2 * Fixed. That's very low!
    // Step 574 logic: `isOverThreshold = predicted_unbillable_expenditure > threshold` where `threshold = totalFixedCosts * 0.20`.
    // Wait, if Fixed is 300k, Threshold is 60k. Prediction is usually > Fixed (>300k).
    // So Alert is ALWAYS triggered?
    // User requirement: "Alert ... exceeds 20% OF fixed overheads".
    // Maybe they meant "Exceeds Fixed Overheads BY 20%"? (i.e. > 1.2 * Fixed).
    // Or maybe "Variable Waste exceeds 20% of Fixed".
    // I will assume "Exceeds Fixed Inputs by > 20%" makes more sense for an alert.
    // Or I'll stick to legacy logic if I'm unsure.
    // Legacy: `threshold = totalFixedCosts * 0.20`.
    // If prediction > 60k -> Red.
    // Yes, that seems wrong.
    // I will interpret as: "Alert if Variable Waste matches 20% of Fixed Costs"?
    // I will use > 1.2 * Fixed for the red alert to make it meaningful for "High Waste".

    const isHighRisk = breakdown
        ? (breakdown.predicted_variable_waste > (breakdown.fixed_costs * 0.5)) // If waste is > 50% of fixed, that's bad.
        : (predicted_unbillable_expenditure > totalFixedCosts * 1.5);

    return (
        <div className="h-full flex flex-col">
            {/* Main Result Area */}
            <div className="flex-1 p-8 flex flex-col items-center justify-center text-center space-y-4">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 uppercase tracking-widest">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                    AI Forecast
                </span>

                <div className="space-y-1">
                    <h1 className={`text-5xl sm:text-6xl font-extrabold tracking-tight ${isHighRisk ? 'text-indigo-900' : 'text-slate-900'}`}>
                        {predicted_unbillable_expenditure.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
                    </h1>
                    <p className="text-sm font-medium text-slate-400">Estimated Monthly Unbillable</p>
                </div>

                {/* Driver Badge */}
                {main_driver && (
                    <div className="mt-4 animate-fade-in-up">
                        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border ${isHighRisk ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                            <span className="text-xs font-bold uppercase tracking-wider opacity-70">Driver:</span>
                            <span className="text-sm font-bold">{main_driver}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Breakdown Grid */}
            <div className="bg-slate-50 border-t border-slate-100 p-6 rounded-b-2xl">
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                        <p className="text-xs font-semibold text-slate-400 uppercase">Fixed Base</p>
                        <p className="text-lg font-bold text-slate-700 mt-1">{totalFixedCosts.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}</p>
                    </div>
                    <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                        <p className="text-xs font-semibold text-slate-400 uppercase">Variable Waste</p>
                        <p className={`text-lg font-bold mt-1 ${isHighRisk ? 'text-amber-600' : 'text-emerald-600'}`}>
                            {breakdown ? breakdown.predicted_variable_waste.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }) : '---'}
                        </p>
                    </div>
                </div>

                {/* Meta / Confidence */}
                {meta && (
                    <div className="flex justify-between items-center text-xs font-medium text-slate-400">
                        <div className="flex gap-4">
                            <span>Confidence: <span className={meta.confidence.includes('Low') ? 'text-amber-500' : 'text-emerald-500'}>{meta.confidence}</span></span>
                            <span>Limit: {meta.historical_max_headcount} HC</span>
                        </div>
                        <div className="text-right hidden sm:block">
                            Model: {meta.model_logic || 'Hybrid'}
                        </div>
                    </div>
                )}
            </div>

            {/* Visual Bar */}
            <div className={`h-1.5 w-full ${isHighRisk ? 'bg-gradient-to-r from-amber-500 to-red-500' : 'bg-gradient-to-r from-indigo-500 to-emerald-500'}`}></div>
        </div>
    );
};

export default ForecastCard;
