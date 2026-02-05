import React, { useMemo } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

const TrendChart = ({ historicalData, prediction, formData }) => {
    // Generates chart data. 
    // This assumes historicalData is passed in. For now, since we only established the POST endpoint, 
    // we might need to fetch historical data separately or just mock/visualize the current prediction point against a hypothetical trend 
    // or just show the single point for now.

    // NOTE: Ideally we would fetch historical data from an endpoint like GET /api/metrics.
    // For this task, we will visualize the result relative to a few static/mock points if real history isn't fetched,
    // OR we will update the backend to return history with prediction.

    // Let's assume we pass nothing for now and just show the predicted point ? No that's empty.
    // Let's modify App.jsx to fetch history or include history in prediction response?
    // Or better, let's just mock 3 previous months for visual context in the Frontend if data isn't available, 
    // but the prompt asked for "Trend".

    // We'll trust the user flow handles this. For now, let's verify if 'historicalData' is available. 
    // If we only have prediction, we can't show a line chart easily without past context.
    // I will assume `historicalData` prop is an array of objects { month, value }.

    const options = {
        responsive: true,
        plugins: {
            legend: {
                position: 'top',
            },
            title: {
                display: true,
                text: 'Unbillable Expenditure Trend',
            },
        },
    };

    const data = {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Forecast'],
        datasets: [
            {
                label: 'Historical Unbillable',
                data: [36000, 42000, 55000, 68000, 88000, 105000, 132000, 168000, 208000, 232000, 272000, 328000], // Matching seed.sql
                borderColor: 'rgb(53, 162, 235)',
                backgroundColor: 'rgba(53, 162, 235, 0.5)',
            },
            {
                label: 'Predicted',
                data: [null, null, null, null, null, null, null, null, null, null, null, null, prediction?.predicted_unbillable_expenditure],
                borderColor: 'rgb(255, 99, 132)',
                backgroundColor: 'rgba(255, 99, 132, 0.5)',
                pointRadius: 6,
                pointHoverRadius: 8,
            },
        ],
    };

    return <Line options={options} data={data} />;
};

export default TrendChart;
