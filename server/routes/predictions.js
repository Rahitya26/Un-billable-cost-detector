const express = require('express');
const router = express.Router();
const predictionController = require('../controllers/predictionController');

router.post('/predict', predictionController.predictUnbillable);
router.post('/metrics', predictionController.addMetric);

module.exports = router;
