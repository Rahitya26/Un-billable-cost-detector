import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

const SimulationDashboard = ({ prediction, originalInputs }) => {
    if (!prediction || !prediction.model_details) return null;

    const { headcount: baseHeadcount, utilization: baseUtilization, rent, software_costs } = originalInputs;
    const [chartData, setChartData] = useState([]);
    const [savingsPotential, setSavingsPotential] = useState(0);

    // --- MIRROR BACKEND LOGIC ---
    // exact replication of Server's predictionController.js logic (Step 460+)
    const calculateProjectedCost = (h, u) => {
        const headCountVal = parseFloat(h);
        const utilizationVal = parseFloat(u);
        const rentVal = parseFloat(rent);
        const softwareVal = parseFloat(software_costs);

        // 1. Calculate The Base
        const baseFixed = rentVal + softwareVal;
        const overhead = headCountVal <= 2 ? 0 : (headCountVal * 600);
        const totalFixed = baseFixed + overhead;

        let predicted = 0;

        // 2. Determine Raw Prediction (The Logic Split)
        if (headCountVal < 20) {
            // Scenario A: Small Team (Headcount < 20)
            // Waste = (100 - utilization) * 500 (Standardized for both cases per user Step 460)
            const waste = (100 - utilizationVal) * 500;
            predicted = totalFixed + waste;
        } else {
            // Scenario B: Large Team (Headcount >= 20)
            // Step 1: Estimate Waste (Proxy: HC * Idle% * 20000)
            const rawWaste = headCountVal * ((100 - utilizationVal) / 100) * 20000;

            if (utilizationVal > 80) {
                // Step 2: Apply High Efficiency Cap
                const multiplier = 1 + ((100 - utilizationVal) / 20);
                const cap = totalFixed * multiplier;
                predicted = Math.min(totalFixed + rawWaste, cap);
            } else {
                // Step 3: Low Efficiency
                predicted = totalFixed + rawWaste;
            }
        }

        // 3. Apply The "Trust Buffer" (Final Safety Net)
        const softCap = baseFixed * 2.5;

        if (predicted > softCap) {
            const excess = predicted - softCap;
            const discountedExcess = excess * 0.4; // 60% discount on excess
            predicted = softCap + discountedExcess;
        }

        return Math.round(predicted);
    };

    // Generate Chart Data (Calibrated)
    useEffect(() => {
        if (!prediction) return;

        const headCountVal = parseFloat(baseHeadcount);
        const rentVal = parseFloat(rent);
        const softwareVal = parseFloat(software_costs);

        // Calculate Hard Floor (Fixed Bills + Overhead) needed for clamping
        const overhead = headCountVal <= 2 ? 0 : (headCountVal * 600);
        const totalFixed = rentVal + softwareVal + overhead;

        // 1. Calculate Calibration Offset
        // What does our frontend formula think the cost is RIGHT NOW?
        const theoreticalCost = calculateProjectedCost(baseHeadcount, baseUtilization);

        // How far off is it from the REAL backend prediction?
        const calibrationOffset = prediction.predicted_unbillable_expenditure - theoreticalCost;

        const data = [];
        for (let u = 60; u <= 100; u += 5) {
            const rawCost = calculateProjectedCost(baseHeadcount, u);

            // 2. Apply Offset to entire curve so it passes through the actual prediction point
            let calibratedCost = rawCost + calibrationOffset;

            // 3. Safety Clamp (Never go below fixed costs!)
            calibratedCost = Math.max(calibratedCost, totalFixed);

            data.push({
                utilization: u,
                cost: Math.round(calibratedCost),
                isCurrent: u === Math.round(baseUtilization)
            });
        }
        setChartData(data);

        // Calculate Savings Potential (Move to 90% Utilization)
        if (baseUtilization < 90) {
            // Use calibrated values for accuracy
            const currentCost = Math.max(calculateProjectedCost(baseHeadcount, baseUtilization) + calibrationOffset, totalFixed);
            const targetCost = Math.max(calculateProjectedCost(baseHeadcount, 90) + calibrationOffset, totalFixed);
            setSavingsPotential(Math.max(0, currentCost - targetCost));
        } else {
            setSavingsPotential(0);
        }

    }, [baseHeadcount, baseUtilization, rent, software_costs, prediction]);

    const formatCurrency = (val) => val.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

    return (
        <div className="mt-8 space-y-6 animate-fade-in-up delay-100">

            {/* Visual Chart */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-96">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Cost vs. Utilization Projection</h3>
                </div>
                <ResponsiveContainer width="100%" height="85%">
                    <AreaChart data={chartData}>
                        <defs>
                            <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis
                            dataKey="utilization"
                            label={{ value: 'Utilization %', position: 'insideBottom', offset: -5, fontSize: 12, fill: '#94a3b8' }}
                            stroke="#94a3b8"
                            tickFormatter={(val) => `${val}%`}
                        />
                        <YAxis
                            hide={true}
                            domain={['dataMin', 'dataMax']}
                        />
                        <Tooltip
                            formatter={(value) => [formatCurrency(value), "Projected Cost"]}
                            labelFormatter={(label) => `Utilization: ${label}%`}
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <ReferenceLine x={baseUtilization} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'top', value: 'Current', fill: '#ef4444', fontSize: 12, fontWeight: 'bold' }} />
                        <Area
                            type="monotone"
                            dataKey="cost"
                            stroke="#6366f1"
                            fillOpacity={1}
                            fill="url(#colorCost)"
                            strokeWidth={3}
                            activeDot={{ r: 6, fill: '#ef4444' }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Pro Tip Box */}
            {savingsPotential > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
                    <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                    </div>
                    <div>
                        <h4 className="font-bold text-emerald-800 text-sm">Pro Tip: Boost Efficiency to 90%</h4>
                        <p className="text-emerald-700 text-sm mt-1">
                            By improving utilization from <strong>{baseUtilization}%</strong> to <strong>90%</strong>, you could save approximately <span className="font-bold text-lg">{formatCurrency(savingsPotential)}</span> per month.
                        </p>
                    </div>
                </div>
            )}

        </div>
    );
};

export default SimulationDashboard;
