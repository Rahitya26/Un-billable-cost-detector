import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

const SimulationDashboard = ({ prediction, originalInputs }) => {
    if (!prediction || !prediction.model_details) return null;

    const { weights, intercept } = prediction.model_details;
    const { headcount: baseHeadcount, utilization: baseUtilization, rent, software_costs } = originalInputs;

    const [chartData, setChartData] = useState([]);

    // Transform Logic (Must match Server!)
    const transform = (h, s, r, u) => {
        const hc = parseFloat(h);
        const util = parseFloat(u);

        // Feature Engineering
        const normalizedHC = Math.sqrt(hc);
        const logIneff = Math.log(101 - util);
        const waste = hc * (100 - util);
        const startupFriction = (100 - util) * Math.exp(-hc / 10);

        return [normalizedHC, parseFloat(s), parseFloat(r), logIneff, waste, startupFriction];
    };

    // Prediction Logic
    const calculatePrediction = (h, u) => {
        const features = transform(h, software_costs, rent, u);
        let pred = intercept;

        // Weights is array of arrays [[w1], [w2]...]
        for (let i = 0; i < features.length; i++) {
            pred += features[i] * weights[i][0];
        }

        const totalFixed = parseFloat(rent) + parseFloat(software_costs);

        // --- Server-Side Logic Replication ---
        // 1. Optimized Base (Global Data Correction)
        // If utilization is very high (>=95) but prediction is anomalously high (> 1.5x Fixed), clamp it.
        if (u >= 95 && pred > (totalFixed * 1.5)) {
            pred = totalFixed + (totalFixed * 0.1); // Bills + 10% overhead
        }

        // 2. Guardrails (Floor at Fixed Costs)
        if (pred < totalFixed) pred = totalFixed;

        return pred;
    };

    // Generate Chart Data (Cost Curve vs Utilization)
    useEffect(() => {
        const data = [];
        for (let u = 50; u <= 100; u += 5) { // 50% to 100% curve
            const cost = calculatePrediction(baseHeadcount, u);
            data.push({
                utilization: u,
                cost: Math.round(cost),
                isCurrent: u === Math.round(baseUtilization)
            });
        }
        setChartData(data);
    }, [baseHeadcount, baseUtilization]); // Fixed dependencies

    return (
        <div className="mt-8 space-y-6 animate-fade-in-up delay-100">

            {/* Visual Chart */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-80">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Cost vs. Utilization Curve</h3>
                </div>
                <ResponsiveContainer width="100%" height="85%">
                    <LineChart data={chartData}>
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
                            formatter={(value) => [value.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }), "Unbillable Cost"]}
                            labelFormatter={(label) => `Utilization: ${label}%`}
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <ReferenceLine x={baseUtilization} stroke="#6366f1" strokeDasharray="3 3" label={{ position: 'top', value: 'Current', fill: '#6366f1', fontSize: 10 }} />
                        <Line
                            type="monotone"
                            dataKey="cost"
                            stroke="#cbd5e1"
                            strokeWidth={3}
                            dot={{ r: 4, strokeWidth: 0, fill: '#cbd5e1' }}
                            activeDot={{ r: 6, fill: '#6366f1' }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>

        </div>
    );
};

export default SimulationDashboard;
