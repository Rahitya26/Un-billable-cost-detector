const db = require('../db');
const MLR = require('ml-regression-multivariate-linear');

const predictUnbillable = async (req, res) => {
    try {
        const { headcount, software_costs, rent, utilization } = req.body;

        if (headcount === undefined || software_costs === undefined || rent === undefined || utilization === undefined) {
            return res.status(400).json({ error: 'Missing required fields: headcount, software_costs, rent, utilization' });
        }

        // Fetch historical data
        const result = await db.query('SELECT headcount, software_costs, rent, utilization_percentage, actual_unbillable_expenditure FROM organization_metrics ORDER BY month_year ASC');
        const data = result.rows;

        if (data.length < 2) {
            return res.status(400).json({ error: 'Not enough historical data to generate a prediction (need at least 2 records).' });
        }

        // --- Feature Engineering Helper ---
        // Transform inputs into model features
        // 1. Headcount
        // 2. Software
        // 3. Rent
        // 4. LogInefficiency = Math.log(101 - Utilization) -> Non-Linear Scaling for drops in efficiency
        // 5. WasteInteraction = Headcount * (100 - Utilization) -> Scale Proportional Weighting
        const transform = (h, s, r, u) => {
            const util = parseFloat(u);
            const logIneff = Math.log(101 - util);
            
            const waste = parseFloat(h) * (100 - util);
            return [parseFloat(h), parseFloat(s), parseFloat(r), logIneff, waste];
        };


        const X = data.map(row => transform(row.headcount, row.software_costs, row.rent, row.utilization_percentage));
        const Y = data.map(row => [parseFloat(row.actual_unbillable_expenditure)]);


        const numFeatures = 5;
        const sums = new Array(numFeatures).fill(0);
        X.forEach(row => {
            row.forEach((val, idx) => sums[idx] += val);
        });
        const means = sums.map(sum => sum / X.length);


        const mlr = new MLR(X, Y);
        const weights = mlr.weights; // [w_hc, w_soft, w_rent, w_logIneff, w_waste]

        // Prepare Prediction Input
        const inputFeatures = transform(headcount, software_costs, rent, utilization);

        // Predict
        const predictionResult = mlr.predict(inputFeatures);
        let predictedUnbillable = predictionResult[0];

        // --- Accurate Driver Logic (Coefficient Analysis via Deviation) ---
        // Feature Names map
        const featureNames = [
            'Headcount Volume',
            'Software Infrastructure',
            'Fixed Rent',
            'Efficiency Drop (Exponential)',
            'Scale-Adjusted Waste'
        ];

        // Impact = Weight * (InputValue - MeanValue)
        const impacts = weights.map((w, idx) => {
            const diff = (inputFeatures[idx] || 0) - (means[idx] || 0);
            const contribution = (w !== undefined && w !== null) ? w * diff : 0;
            return {
                name: featureNames[idx],
                raw_feature_name: featureNames[idx],
                value: isNaN(contribution) ? 0 : contribution,
                abs: Math.abs(isNaN(contribution) ? 0 : contribution),
                debug_weight: w,
                debug_diff: diff
            };
        });

        // Identify Main Driver
        const mainDriverObj = impacts.reduce((prev, current) => (prev.abs > current.abs) ? prev : current);
        let mainDriver = mainDriverObj.name;

        // Semantic Labeling for UI
        if (mainDriver === 'Efficiency Drop (Exponential)' || mainDriver === 'Scale-Adjusted Waste') {
            if (utilization < 75) {
                mainDriver = `Low Efficiency Impact (${utilization}%)`;
            } else {
                mainDriver = 'Utilization Variance';
            }
        } else if (mainDriver === 'Headcount Volume') {
            mainDriver = `Headcount Variance`;
        }

        // --- Guardrail Logic ---
        const rentValue = parseFloat(rent);
        if (predictedUnbillable < rentValue || isNaN(predictedUnbillable)) {
            predictedUnbillable = rentValue;
            mainDriver = 'Fixed Infrastructure Costs (Rent Floor)';
        } else {
            predictedUnbillable = Math.max(0, predictedUnbillable);
        }

        res.json({
            predicted_unbillable_expenditure: parseFloat(predictedUnbillable.toFixed(2)),
            main_driver: mainDriver,
            model_details: {
                weights: weights,
                means: means,
                intercept: mlr.intercept || 0,
                description: 'Transformed Linear Regression: HC, Soft, Rent, Log(101-Util), HC*(100-Util)'
            },
            impact_analysis: impacts,
            debug_inputs: inputFeatures
        });

    } catch (err) {
        console.error('Error in prediction:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

const addMetric = async (req, res) => {
    try {
        const { headcount, software_costs, rent, utilization, actual_unbillable_expenditure, month_year } = req.body;

        if (!headcount || !software_costs || !rent || !utilization || !actual_unbillable_expenditure || !month_year) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const query = `
            INSERT INTO organization_metrics (month_year, headcount, software_costs, rent, utilization_percentage, actual_unbillable_expenditure)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;
        const values = [month_year, headcount, software_costs, rent, utilization, actual_unbillable_expenditure];

        const result = await db.query(query, values);

        res.status(201).json({ message: 'Metric added successfully', data: result.rows[0] });

    } catch (err) {
        console.error('Error adding metric:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

module.exports = {
    predictUnbillable,
    addMetric
};
