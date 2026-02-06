const MLR = require('ml-regression-multivariate-linear');

// Mock Data for training (same as controller logic assumption or minimal set)
// Ideally we need the weights. Since we don't have the DB, I will assume the weights from previous execution or
// I will just mock the logic part *after* weights are calculated if I can't run MLR.
// But wait, the controller TRAINS the model on every request using DB data?
// Yes: "const result = await db.query(...)" then "const mlr = new MLR(X, Y);"
// Accessing the DB is hard here without credentials/env.

// However, I can look at the code logic provided in previous turns.
// The user says "maindriver logic ... is not working efficiently".

// Let's look at the specific logic block in the controller.
/*
        // If we used fallback data, we must be stricter with the result
        if (utilization >= 95 && predictedUnbillable > (totalFixed * 1.5)) {
            predictedUnbillable = totalFixed + (totalFixed * 0.1); // Bills + 10% overhead
            mainDriver = "Optimized Base (Global Data Correction)";
        }
*/

// Input: HC=10, Util=95, Rent=50k, Soft=500k. TotalFixed = 550,000.
// If Pred > 1.5 * 550k (825k), it clamps.
// But with 95% utilization, waste should be low.
// The logic "Optimized Base" might be overriding a more specific driver like "High Software Cost" (if that even exists).

// Let's create a script that just runs the logic logic flow with dummy weights to see what happens.

const inputs = {
    headcount: 10,
    utilization: 95,
    rent: 50000,
    software_costs: 500000
};

const totalFixed = inputs.rent + inputs.software_costs;
console.log("Total Fixed:", totalFixed);

// Mock weights (random but realistic signs)
// [w_hc, w_soft, w_rent, w_logIneff, w_waste, w_startup]
const weights = [100, 0.1, 0.1, 5000, 10, 500];
const means = [3, 50000, 50000, 2, 500, 20]; // Mock means

const transform = (h, s, r, u) => {
    const hc = parseFloat(h);
    const util = parseFloat(u);
    const normalizedHC = Math.sqrt(hc);
    const logIneff = Math.log(101 - util);
    const waste = hc * (100 - util);
    const startupFriction = (100 - util) * Math.exp(-hc / 10);
    return [normalizedHC, parseFloat(s), parseFloat(r), logIneff, waste, startupFriction];
};

const inputFeatures = transform(inputs.headcount, inputs.software_costs, inputs.rent, inputs.utilization);

const featureNames = [
    'Headcount Volume',
    'Software Infrastructure',
    'Fixed Rent',
    'Efficiency Drop (Exponential)',
    'Scale-Adjusted Waste',
    'Startup Frictional Waste'
];

// Calculate impacts
const impacts = weights.map((w, idx) => {
    const diff = (inputFeatures[idx] || 0) - (means[idx] || 0);
    const contribution = w * diff;
    return {
        name: featureNames[idx],
        value: contribution,
        abs: Math.abs(contribution)
    };
});

console.log("Impacts:", impacts);

const mainDriverObj = impacts.reduce((prev, current) => (prev.abs > current.abs) ? prev : current);
let mainDriver = mainDriverObj.name;
console.log("Raw Main Driver:", mainDriver);

// Logic Check
if (inputs.utilization >= 95) {
    console.log("Utilization >= 95. Checking Override...");
    // The "Optimized Base" logic in controller
    // relies on predictedUnbillable > totalFixed * 1.5.
    // With Util 95, unbillable should be small.
    // If it IS small, this override doesn't trigger.
}

// Semantic Labeling Check
if (mainDriver === 'Efficiency Drop (Exponential)' || mainDriver === 'Scale-Adjusted Waste') {
    if (inputs.utilization < 75) {
        mainDriver = `Low Efficiency Impact (${inputs.utilization}%)`;
    } else {
        mainDriver = 'Utilization Variance';
    }
} else if (mainDriver === 'Startup Frictional Waste') {
    mainDriver = 'Small Team Inefficiency (Startup Friction)';
} else if (mainDriver === 'Headcount Volume') {
    mainDriver = `Headcount Variance`;
}

console.log("Final Semantic Main Driver:", mainDriver);
