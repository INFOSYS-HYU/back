const express = require('express');
const router = express.Router();
const { getFinance, getFinanceById } = require('../userDBC');

router.get('/', async (req, res) => {
  try {
    const financeData = await getFinance();
    res.json({ response: financeData });
  } catch (error) {
    console.error("Error fetching finance data:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get('/:id', async (req, res) => {
  const financeId = parseInt(req.params.id, 10);

  try {
    const financeData = await getFinanceById(financeId);
    if (financeData) {
      res.json(financeData);
    } else {
      res.status(404).json({ error: "Finance data not found" });
    }
  } catch (error) {
    console.error("Error fetching finance data by ID:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;

