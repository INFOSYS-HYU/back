const express = require('express');
const router = express.Router();
const { getCalendar, createCalendar, updateCalendar, deleteCalendar } = require('../userDBC');

router.get('/', async (req, res) => {
  try {
    const calendarData = await getCalendar();
    res.json(calendarData);
  } catch (error) {
    console.error("Error fetching calendar data:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post('/', async (req, res) => {
  const { startDate, endDate, title, content } = req.body;

  if (!startDate || !endDate || !title || !content) {
    return res.status(400).json({ error: '필수 필드가 누락되었습니다.' });
  }

  try {
    const newCalendar = await createCalendar(startDate, endDate, title, content);
    res.status(201).json(newCalendar);
  } catch (error) {
    res.status(500).json({ error: '캘린더 생성 중 오류가 발생했습니다.' });
  }
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { startDate, endDate, title, content } = req.body;

  if (!startDate || !endDate || !title || !content) {
    return res.status(400).json({ error: '필수 필드가 누락되었습니다.' });
  }

  try {
    const updatedCalendar = await updateCalendar(id, startDate, endDate, title, content);
    if (updatedCalendar) {
      res.status(200).json(updatedCalendar);
    } else {
      res.status(404).json({ error: '캘린더 이벤트를 찾을 수 없습니다.' });
    }
  } catch (error) {
    res.status(500).json({ error: '캘린더 수정 중 오류가 발생했습니다.' });
  }
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const success = await deleteCalendar(id);
    if (success) {
      res.status(200).json({ message: '캘린더 이벤트가 성공적으로 삭제되었습니다.' });
    } else {
      res.status(404).json({ error: '캘린더 이벤트를 찾을 수 없습니다.' });
    }
  } catch (error) {
    res.status(500).json({ error: '캘린더 삭제 중 오류가 발생했습니다.' });
  }
});

module.exports = router;