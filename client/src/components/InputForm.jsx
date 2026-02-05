import React from 'react';

const FormattedNumberInput = ({ label, name, value, onChange, placeholder, required = false }) => {
    // Format for display: 1234 -> 1,234
    const displayValue = value ? Number(value).toLocaleString('en-IN') : '';

    const handleChange = (e) => {
        // Strip commas/spaces to get raw number
        const rawValue = e.target.value.replace(/[^0-9.]/g, '');

        // Parent expects { target: { name, value } }
        onChange({
            target: {
                name: name,
                value: rawValue
            }
        });
    };

    return (
        <label className="block">
            <span className="text-sm font-semibold text-slate-700">{label}</span>
            <input
                type="text"
                name={name}
                value={displayValue}
                onChange={handleChange}
                className="mt-1 block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                placeholder={placeholder}
                required={required}
                autoComplete="off"
            />
        </label>
    );
};

const InputForm = ({ formData, handleChange, handlePredict, isLoading, onSubmitActual }) => {
    return (
        <div className="p-6 md:p-8 bg-white">
            <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <span className="w-1 h-6 bg-indigo-500 rounded-full"></span>
                Resource Inputs
            </h2>
            <form onSubmit={handlePredict} className="space-y-6">

                {/* Section 1 */}
                <div className="space-y-4">
                    <FormattedNumberInput
                        label="Headcount"
                        name="headcount"
                        value={formData.headcount}
                        onChange={handleChange}
                        placeholder="Total employees"
                        required

                    />

                    <label className="block">
                        <span className="text-sm font-semibold text-slate-700">Utilization %</span>
                        <input
                            type="number"
                            name="utilization"
                            value={formData.utilization}
                            onChange={handleChange}
                            className="mt-1 block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                            placeholder="e.g. 85"
                            min="0"
                            max="100"
                            required
                        />
                    </label>
                </div>

                {/* Divider */}
                <div className="relative">
                    <div className="absolute inset-0 flex items-center" aria-hidden="true">
                        <div className="w-full border-t border-slate-100"></div>
                    </div>
                    <div className="relative flex justify-center">
                        <span className="px-3 bg-white text-xs font-medium text-slate-400 uppercase tracking-wider">Monthly overheads</span>
                    </div>
                </div>

                {/* Section 2 */}
                <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormattedNumberInput
                            label="Rent (₹)"
                            name="rent"
                            value={formData.rent}
                            onChange={handleChange}
                            placeholder="Fixed Cost"
                            required
                        />
                        <FormattedNumberInput
                            label="Software (₹)"
                            name="software_costs"
                            value={formData.software_costs}
                            onChange={handleChange}
                            placeholder="Licenses"
                            required
                        />
                    </div>
                </div>

                <div className="pt-2">
                    <button
                        type="submit"
                        disabled={isLoading}
                        className={`w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg shadow-indigo-500/30 text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all transform active:scale-[0.98] ${isLoading ? 'opacity-70 cursor-wait' : ''}`}
                    >
                        {isLoading ? (
                            <span className="flex items-center gap-2">
                                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                Running Model...
                            </span>
                        ) : 'Generate Forecast'}
                    </button>
                </div>

                {/* Training Mode Inputs (Collapsible or Subtle) */}
                <div className="mt-8 pt-6 border-t border-slate-100">
                    <details className="group">
                        <summary className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-400 hover:text-indigo-600 transition-colors list-none">
                            <span className="group-open:rotate-90 transition-transform">▶</span>
                            <span>Continuous Learning Mode (Admin)</span>
                        </summary>
                        <div className="mt-4 p-4 bg-slate-50 rounded-xl space-y-3">
                            <FormattedNumberInput
                                label="Actual Unbillable (₹)"
                                name="actualUnbillable"
                                value={formData.actualUnbillable || ''}
                                onChange={handleChange}
                                placeholder="Enter verified historical cost"
                            />
                            {formData.actualUnbillable && (
                                <button
                                    type="button"
                                    onClick={onSubmitActual}
                                    className="w-full py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors"
                                >
                                    Train Model with Actuals
                                </button>
                            )}
                        </div>
                    </details>
                </div>
            </form>
        </div>
    );
};

export default InputForm;
