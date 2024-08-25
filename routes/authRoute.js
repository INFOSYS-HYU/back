const express = require('express');
const router = express.Router();
const authStudent = require('../auth');

router.post('/student', (req, res) => {
  const { studentId, name } = req.body;

  if (!studentId || !name) {
    return res
      .status(400)
      .json({ error: "학번과 이름을 모두 제공해야 합니다." });
  }

  authStudent(studentId, name);
});