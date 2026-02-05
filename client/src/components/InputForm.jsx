import React from 'react';

const InputForm = ({ formData, handleChange, handlePredict, isLoading, onSubmitActual }) => {

    return (
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">Resource Input</h2>
            <form onSubmit={handlePredict} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Headcount (Total Employees)</label>
                    <input
                        type="number"
                        name="headcount"
                        value={formData.headcount}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        placeholder="e.g. 40"
                        min="0"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Rent (₹)</label>
                    <input
                        type="number"
                        name="rent"
                        value={formData.rent}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        placeholder="e.g. 250000"
                        min="0"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Software Costs (₹)</label>
                    <input
                        type="number"
                        name="software_costs"
                        value={formData.software_costs}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        placeholder="e.g. 80000"
                        min="0"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Utilization % (Efficiency)</label>
                    <input
                        type="number"
                        name="utilization"
                        value={formData.utilization}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        placeholder="e.g. 85"
                        min="0"
                        max="100"
                        required
                    />
                </div>

                <div className="pt-4 border-t border-gray-100">
                    <label className="block text-sm font-medium text-gray-500 mb-1">Actual Unbillable (For Training)</label>
                    <input
                        type="number"
                        name="actualUnbillable"
                        value={formData.actualUnbillable || ''}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-200 rounded-md text-sm bg-gray-50 focus:bg-white focus:ring-1 focus:ring-green-500 outline-none transition-all"
                        placeholder="Optional: Enter real cost to train model"
                    />
                </div>

                <div className="flex gap-2">
                    <button
                        type="submit"
                        disabled={isLoading}
                        className={`flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {isLoading ? 'Calculating...' : 'Predict'}
                    </button>
                    {formData.actualUnbillable && (
                        <button
                            type="button"
                            onClick={onSubmitActual}
                            className="bg-green-600 text-white py-2 px-4 rounded-md shadow-sm text-sm font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                        >
                            Submit Actuals
                        </button>
                    )}
                </div>
            </form>
        </div >
    );
};

export default InputForm;
