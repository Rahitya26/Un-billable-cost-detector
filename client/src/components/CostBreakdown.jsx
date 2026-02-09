import React, { useMemo } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

const CostBreakdown = ({ prediction, formData }) => {
    if (!prediction || !formData) return null;

    const { breakdown, totalPredicted, healthStatus } = useMemo(() => {
        const total = prediction.predicted_unbillable_expenditure;
        const rent = parseFloat(formData.rent) || 0;
        const software = parseFloat(formData.software_costs) || 0;
        const hc = parseFloat(formData.headcount) || 0;

        // 1. Core Bills
        const coreBills = rent + software;

        // 2. Ops Overhead (Solopreneur Rule)
        let opsOverhead = hc <= 2 ? 0 : (hc * 600);

        // 3. Efficiency Gap (The Remainder)
        let efficiencyGap = total - (coreBills + opsOverhead);
        if (efficiencyGap < 0) {
            efficiencyGap = 0;
            if (coreBills + opsOverhead > total) {
                opsOverhead = Math.max(0, total - coreBills);
            }
        }

        // Health Check
        const wasteRatio = efficiencyGap / total;
        let status = { color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'Operational Efficiency is Healthy' };

        if (wasteRatio > 0.30) {
            status = { color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', text: 'Critical: High Efficiency Leakage Detected' };
        } else if (wasteRatio > 0.10) {
            status = { color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', text: 'Warning: Moderate Efficiency Gap' };
        }

        return {
            breakdown: [coreBills, opsOverhead, efficiencyGap],
            totalPredicted: total,
            healthStatus: status
        };
    }, [prediction, formData]);

    const data = {
        labels: ['Core Bills', 'Ops Overhead', 'Efficiency Gap'],
        datasets: [
            {
                data: breakdown,
                backgroundColor: [
                    '#6366f1', // Indigo - Bills
                    '#cbd5e1', // Slate - Overhead
                    '#ef4444', // Red - Waste
                ],
                borderColor: [
                    '#ffffff',
                    '#ffffff',
                    '#ffffff',
                ],
                borderWidth: 2,
                hoverOffset: 4
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '85%', // Thinner ring
        plugins: {
            legend: {
                display: false // We will build a custom one
            },
            tooltip: {
                enabled: true,
                callbacks: {
                    label: function (context) {
                        const val = context.raw;
                        return val.toLocaleString('en-IN', {
                            style: 'currency',
                            currency: 'INR',
                            maximumFractionDigits: 0
                        });
                    }
                }
            }
        }
    };

    // Plugin to draw text in center (Adjusted for smaller size)
    const centerTextPlugin = {
        id: 'centerText',
        beforeDraw: function (chart) {
            const width = chart.width,
                height = chart.height,
                ctx = chart.ctx;

            ctx.restore();
            const fontSize = (height / 100).toFixed(2);
            ctx.font = `bold ${fontSize}em Inter, sans-serif`;
            ctx.textBaseline = "middle";
            ctx.fillStyle = "#1e293b";

            const text = totalPredicted.toLocaleString('en-IN', {
                style: 'currency',
                currency: 'INR',
                maximumFractionDigits: 0,
                notation: 'compact'
            });
            // Center roughly
            const textX = Math.round((width - ctx.measureText(text).width) / 2);
            const textY = height / 2;

            ctx.fillText(text, textX, textY);
            ctx.save();
        }
    };

    const labels = ['Core Bills', 'Ops Overhead', 'Efficiency Gap'];
    const colors = ['bg-indigo-500', 'bg-slate-300', 'bg-red-500'];
    const textColors = ['text-indigo-700', 'text-slate-600', 'text-red-600'];

    return (
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm h-full flex flex-col justify-between">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Cost Distribution</h3>

            <div className="flex items-center gap-6 mb-2">
                {/* Chart Section */}
                <div className="relative w-40 h-40 flex-shrink-0 mx-auto">
                    <Doughnut data={data} options={options} plugins={[centerTextPlugin]} />
                </div>

                {/* Custom Legend Section */}
                <div className="flex-grow space-y-3">
                    {breakdown.map((val, idx) => (
                        <div key={idx} className="flex justify-between items-center group">
                            <div className="flex items-center gap-2">
                                <span className={`w-2.5 h-2.5 rounded-full ${colors[idx]}`}></span>
                                <span className="text-sm text-slate-600 font-medium">{labels[idx]}</span>
                            </div>
                            <span className={`text-sm font-bold ${textColors[idx]}`}>
                                {val.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
                            </span>
                        </div>
                    ))}
                    <div className="w-full h-px bg-slate-100 my-2"></div>
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-400 uppercase font-bold">Total</span>
                        <span className="text-sm font-bold text-slate-800">
                            {totalPredicted.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
                        </span>
                    </div>
                </div>
            </div>

            {/* Health Insight Footer */}
            <div className={`mt-3 py-2 px-3 rounded-lg border flex items-center gap-2 ${healthStatus.bg} ${healthStatus.border}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${healthStatus.color === 'text-red-600' ? 'bg-red-500' : healthStatus.color === 'text-amber-600' ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>
                <span className={`text-xs font-semibold ${healthStatus.color}`}>
                    {healthStatus.text}
                </span>
            </div>
        </div>
    );
};

export default CostBreakdown;
