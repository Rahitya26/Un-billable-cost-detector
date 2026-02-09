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

        // 1. UNIVERSAL FIXED BASE (Applies to ALL scenarios)
        // Every company has management/repair overheads, even if remote.
        // EXCEPTION: Solopreneurs/Tiny Teams (HC <= 2) don't have management overhead.
        const managementOverhead = headcount <= 2 ? 0 : headcount * 600;
        const basicFixed = parseFloat(rent) + parseFloat(software_costs);
        const totalFixed = basicFixed + managementOverhead;

        let mainDriver;
        let smallTeamCorrection = false;
        let isRemote = parseFloat(rent) === 0;

        // 2. CONTEXT-AWARE VARIABLE LOGIC
        // We refine the ML prediction based on the context (Remote vs Office)

        if (isRemote) {
            // REMOTE SCENARIO (Rent = 0)
            // The ML Model likely trained on office data, so it bakes in "Office Waste" (electricity, snacks) into the variable component.
            // We must STRIP this out for remote teams, while adding our explicit Management Overhead.

            // What the ML thinks is "Variable Waste" (above the basic bills)
            const impliedTotalWaste = predictedUnbillable - basicFixed;

            // We assume 50% of that waste is "Office Specific" (AC, Security, Cleaning). Remote teams save this.
            // The other 50% is "Process Waste" (Inefficiency, Meetings) which remains.
            const remoteVariableWaste = impliedTotalWaste * 0.5;

            // Rebuild prediction: Safe Fixed Base + Reduced Waste
            predictedUnbillable = totalFixed + remoteVariableWaste;

        } else {
            // OFFICE SCENARIO
            // Trust the ML model, but ensure we never drop below our calculated Universal Floor
            if (predictedUnbillable < totalFixed) {
                predictedUnbillable = totalFixed;
            }

            // SANITY CHECK: Universal Cap (e.g. 2.5x Fixed Costs)
            // Prevents "Standard Office" predictions (like 5.85 Lakh) from exploding relative to 100k Fixed.
            // 2.5x allows for reasonable office waste, but caps extreme inefficiency penalties.
            const universalCap = totalFixed * 2.5;
            if (predictedUnbillable > universalCap) {
                predictedUnbillable = universalCap;
            }
        }

        // 3. SMALL TEAM LOGIC (Headcount < 20)
        // Overrides the general logic for specific small-team behaviors
        if (headcount < 20) {
            if (utilization > 85) {
                // LEAN TEAM: Reward high efficiency. Prediction -> Fixed + Small Waste
                const leanWaste = (100 - utilization) * 500; // Very small factor
                const leanPrediction = totalFixed + leanWaste;

                // Only act if the ML/Remote prediction was higher
                if (predictedUnbillable > leanPrediction) {
                    predictedUnbillable = leanPrediction;
                    smallTeamCorrection = true;
                }
            } else {
                // RISKY TEAM: Penalty for high variance in small teams.
                const penalty = (100 - utilization) * 500;
                predictedUnbillable = totalFixed + penalty;
            }
        } else {
            // LARGE TEAM (>20): Keep the existing High Efficiency Clamp Logic
            if (utilization > 80) {
                const variableMultiplier = 1 + ((100 - utilization) / 20);
                const rigidCap = totalFixed * variableMultiplier;
                if (predictedUnbillable > rigidCap) {
                    predictedUnbillable = rigidCap;
                }
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

        // Identify Main Driver (Smart Logic)

        // A. Normalcy Check
        // If the prediction is very close to Fixed Costs (within 20%), it's just standard overhead.
        const isStandardOverhead = predictedUnbillable <= (totalFixed * 1.25); // Slightly relaxed from 1.2 to 1.25

        // 1. Dominant Cost Check (Software Heavy Scenario)
        // If Software is huge (> 50% of Fixed) AND we are in a standard cost range, it IS the driver.
        // BUT if cost is way higher (like 1.36L vs 16k), then Waste is the driver, not Software.
        if (parseFloat(software_costs) > (totalFixed * 0.5) && isStandardOverhead) {
            mainDriver = "Software Infrastructure Costs";
        }
        else if (isStandardOverhead) {
            mainDriver = "Standard Fixed Overheads";
        } else {
            // Maxwell Smart Selection: Pick the highest POSITIVE contributor
            const positiveImpacts = impacts.filter(i => i.value > 0);
            let mainDriverObj;

            if (positiveImpacts.length > 0) {
                mainDriverObj = positiveImpacts.reduce((prev, current) => (prev.value > current.value) ? prev : current);
            } else {
                mainDriverObj = impacts.reduce((prev, current) => (prev.abs > current.abs) ? prev : current);
            }

            mainDriver = mainDriverObj.name;

            // Priority Refinement: Prevent 'Utilization Variance' if Util > 85%
            if (utilization > 85 && (mainDriver === 'Efficiency Drop (Exponential)' || mainDriver === 'Scale-Adjusted Waste')) {
                mainDriver = "Headcount Volume"; // Default to scale driver if efficiency is high
            }

            // B. Zero Check & Priority Overrides

            // If Driver is "Rent" but Rent is 0 -> call it "Standard Fixed Overheads (Remote)"
            if (mainDriver === 'Fixed Rent' && parseFloat(rent) === 0) {
                mainDriver = "Standard Fixed Overheads (Remote)";
            }

            // C. Priority: Actionable Waste vs Fixed Rent
            // If Rent is the winner, BUT Waste is also a significantly high impact (> 50% of Rent's impact),
            // then Pick Waste because it is ACTIONABLE.
            if (mainDriver === 'Fixed Rent') {
                const wasteImpact = impacts.find(i => i.name === 'Scale-Adjusted Waste')?.value || 0;
                const rentImpact = mainDriverObj.value;

                if (wasteImpact > (rentImpact * 0.5)) {
                    mainDriver = "Scale-Adjusted Waste"; // Override!
                }
            }

            // D. Semantic Labeling Cleanup
            if (mainDriver === 'Efficiency Drop (Exponential)' || mainDriver === 'Scale-Adjusted Waste') {
                if (utilization <= 75) {
                    mainDriver = `Low Efficiency Impact (${utilization}%)`;
                } else if (headcount < 20 && utilization <= 85) {
                    mainDriver = "Small Team Inefficiency Risk";
                } else {
                    mainDriver = 'Utilization Variance';
                }
            } else if (mainDriver === 'Startup Frictional Waste') {
                mainDriver = 'Small Team Inefficiency (Startup Friction)';
            } else if (mainDriver === 'Headcount Volume') {
                mainDriver = `Headcount Variance`;
            }
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

        // --- TRUST BUFFER: Soft Cap Logic ---
        // Prevents predictions from appearing unrealistically high compared to fixed bills (Rent + Software).
        // Solution: Apply a 60% discount to any amount exceeding 2.5x of the fixed bills.

        const totalFixedBills = parseFloat(rent) + parseFloat(software_costs);
        const softCap = totalFixedBills * 2.5;

        // Check for Excess
        if (predictedUnbillable > softCap) {
            const excessAmount = predictedUnbillable - softCap;

            // Apply Discount: Reduce excess by 60% (multiply by 0.4)
            // This acknowledges that idle employees are not 100% wasted cost (some value remains/retention).
            const discountedExcess = excessAmount * 0.4;

            // Recalculate Prediction
            predictedUnbillable = softCap + discountedExcess;

            // --- HYBRID DRIVER LOGIC (The Smart Label Fix) ---
            // If the Bills are huge, but the Waste is huge, acknowledge BOTH.
            // Check if Software is the dominant part of the base bills (> 60%)
            const isSoftwareHeavy = parseFloat(software_costs) > (totalFixedBills * 0.60);

            if (isSoftwareHeavy) {
                // Hybrid Label: Acknowledges both the high bill AND the waste
                mainDriver = "High Software Costs & Efficiency Drag";
            } else {
                // Standard Label: Blames the people
                mainDriver = "Workforce Efficiency Gap (High Idle Time)";
            }
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