const db = require('../db');
const MLR = require('ml-regression-multivariate-linear');

const predictUnbillable = async (req, res) => {
    try {
        let { headcount, software_costs, rent, utilization } = req.body;

        // Sanitize and Parse Inputs
        const parseInput = (val) => {
            if (val === undefined || val === null) return undefined;
            const strVal = String(val).replace(/,/g, ''); // Remove commas
            const num = parseFloat(strVal);
            return isNaN(num) ? undefined : num;
        };

        headcount = parseInput(headcount);
        software_costs = parseInput(software_costs);
        rent = parseInput(rent);
        utilization = parseInput(utilization);

        if (headcount === undefined || software_costs === undefined || rent === undefined || utilization === undefined) {
            return res.status(400).json({ error: 'Missing or invalid required fields: headcount, software_costs, rent, utilization' });
        }

        // Validation Short-Circuit: Inactive Organization
        if (headcount <= 0 || utilization < 0) {
            return res.json({
                predicted_unbillable_expenditure: 0,
                main_driver: "Inactive Organization"
            });
        }

        // Cap Utilization at 100 to prevent Math.log() NaN or Domain Errors
        if (utilization > 100) {
            utilization = 100;
        }

        // Fetch historical data
        // 1. Try to find "Peer Data" (+/- 50% range)
        const lowerBound = Math.floor(headcount * 0.5);
        const upperBound = Math.ceil(headcount * 1.5);

        let result = await db.query(
            'SELECT headcount, software_costs, rent, utilization_percentage, actual_unbillable_expenditure FROM organization_metrics WHERE headcount BETWEEN $1 AND $2',
            [lowerBound, upperBound]
        );

        // 2. FALLBACK: If no peers found, use the entire database
        if (result.rows.length < 2) {
            result = await db.query(
                'SELECT headcount, software_costs, rent, utilization_percentage, actual_unbillable_expenditure FROM organization_metrics ORDER BY headcount ASC'
            );
        }

        // 3. FINAL GUARD: If still no data, return a basic calculator result
        if (result.rows.length < 2) {
            const baseline = parseFloat(rent) + parseFloat(software_costs);
            const wasteFactor = (100 - utilization) * (headcount * 50); // Simple heuristic
            return res.json({
                predicted_unbillable_expenditure: baseline + wasteFactor,
                main_driver: "Heuristic Estimate (Insufficient Historical Data)"
            });
        }

        const data = result.rows;

        if (data.length < 2) {
            return res.status(400).json({ error: 'Not enough historical data to generate a prediction (need at least 2 records).' });
        }


        const transform = (h, s, r, u) => {
            const hc = parseFloat(h);
            const util = parseFloat(u);
            // Feature 1: Square root of headcount instead of raw headcount
            // This reduces the "Weight" of large numbers (e.g. 200 becomes 14)
            const normalizedHC = Math.sqrt(hc);

            const logIneff = Math.log(101 - util);
            const waste = hc * (100 - util);
            const startupFriction = (100 - util) * Math.exp(-hc / 10);

            return [normalizedHC, parseFloat(s), parseFloat(r), logIneff, waste, startupFriction];
        };

        const X = data.map(row => transform(row.headcount, row.software_costs, row.rent, row.utilization_percentage));
        const Y = data.map(row => [parseFloat(row.actual_unbillable_expenditure)]);


        const numFeatures = 6;
        const sums = new Array(numFeatures).fill(0);
        X.forEach(row => {
            row.forEach((val, idx) => sums[idx] += val);
        });
        const means = sums.map(sum => sum / X.length);


        const mlr = new MLR(X, Y);
        const weights = mlr.weights;
        // Prepare Prediction Input
        const inputFeatures = transform(headcount, software_costs, rent, utilization);

        // Predict
        const predictionResult = mlr.predict(inputFeatures);
        let predictedUnbillable = predictionResult[0];
        const totalFixed = parseFloat(rent) + parseFloat(software_costs);
        let mainDriver;

        // If we used fallback data, we must be stricter with the result
        // High Efficiency Guardrail: If utilization > 80%, strictly cap the prediction relative to Fixed Costs.
        // This prevents unrealistic "waste" calculations for small, efficient teams.
        if (utilization > 80) {
            const extraAllowed = (100 - utilization) * 0.05; // 0.05 at 99%, 1.0 at 80%? No.
            // Decay function:
            // At 80% Util -> Allow 2.0x Fixed (1.0 + 1.0)
            // At 90% Util -> Allow 1.5x Fixed (1.0 + 0.5)
            // At 100% Util -> Allow 1.1x Fixed (1.0 + 0.1)
            const variableMultiplier = 1 + ((100 - utilization) / 20); // 1.0 + 1.0 = 2.0 at 80%. 1.5 at 90%.

            const rigidCap = totalFixed * variableMultiplier;

            if (predictedUnbillable > rigidCap) {
                predictedUnbillable = rigidCap;
                // Don't overwrite mainDriver yet, let the feature analysis decide (likely Efficiency or Fixed)
            }
        }

        // --- Accurate Driver Logic (Coefficient Analysis via Deviation) ---
        // Feature Names map
        const featureNames = [
            'Headcount Volume',
            'Software Infrastructure',
            'Fixed Rent',
            'Efficiency Drop (Exponential)',
            'Scale-Adjusted Waste',
            'Startup Frictional Waste'
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
        // CRITICAL FIX: Only consider POSITIVE contributors as the "Driver" of cost.
        // If Rent is 0, its contribution is negative (Input < Mean), reducing the cost. It isn't the "Driver".
        const positiveImpacts = impacts.filter(i => i.value > 0);

        let mainDriverObj;
        if (positiveImpacts.length > 0) {
            mainDriverObj = positiveImpacts.reduce((prev, current) => (prev.value > current.value) ? prev : current);
        } else {
            // Fallback if somehow all contributions are negative (rare, implies prediction < Intercept)
            mainDriverObj = impacts.reduce((prev, current) => (prev.abs > current.abs) ? prev : current);
        }

        mainDriver = mainDriverObj.name;

        // Semantic Labeling for UI
        if (mainDriver === 'Efficiency Drop (Exponential)' || mainDriver === 'Scale-Adjusted Waste') {
            if (utilization < 75) {
                mainDriver = `Low Efficiency Impact (${utilization}%)`;
            } else {
                mainDriver = 'Utilization Variance';
            }
        } else if (mainDriver === 'Startup Frictional Waste') {
            mainDriver = 'Small Team Inefficiency (Startup Friction)';
        } else if (mainDriver === 'Headcount Volume') {
            mainDriver = `Headcount Variance`;
        }

        // --- Guardrail Logic ---
        // Guardrail Logic
        if (predictedUnbillable < totalFixed || isNaN(predictedUnbillable)) {
            predictedUnbillable = totalFixed;
            // REMOVED: Overwrite logic. We trust the mainDriver calculated above.
            // If Software was the biggest impact, it stays Software.
            // If Efficiency was the biggest impact (even if we hit floor), it stays Efficiency (explains the deviation from ideal floor).
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
                description: 'Transformed Linear Regression: HC, Soft, Rent, Log(101-Util), HC*(100-Util), StartupFriction'
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
