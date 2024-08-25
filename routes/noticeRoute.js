// routes/noticeRoute.js
const express = require('express');
const router = express.Router();
const { getNotice, getNoticeById, createNotice, updateNotice, deleteNotice } = require('../userDBC');

router.get('/', async (req, res) => {
  try {
    const noticeData = await getNotice();
    res.json(noticeData);
  } catch (error) {
    console.error("Error fetching notices:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get('/:page', async (req, res) => {
  const page = parseInt(req.params.page, 10);
  const limit = 10;
  const offset = (page - 1) * limit;

  try {
    const noticeData = await getNotice(limit, offset);
    res.json(noticeData);
  } catch (error) {
    console.error("Error fetching notices:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get('/detail/:id', async (req, res) => {
  const noticeId = parseInt(req.params.id, 10);

  try {
    const noticeData = await getNoticeById(noticeId);
    if (noticeData) {
      res.json(noticeData);
    } else {
      res.status(404).json({ error: "Notice not found" });
    }
  } catch (error) {
    console.error("Error fetching notice:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post('/', async (req, res) => {
  const { title, content } = req.body;
  try {
    const newNotice = await createNotice(title, content);
    res.status(201).json(newNotice);
  } catch (error) {
    console.error("Error creating notice:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put('/:id', async (req, res) => {
  const noticeId = parseInt(req.params.id, 10);
  const { title, content } = req.body;
  try {
    const updatedNotice = await updateNotice(noticeId, title, content);
    if (updatedNotice) {
      res.json(updatedNotice);
    } else {
      res.status(404).json({ error: "Notice not found" });
    }
  } catch (error) {
    console.error("Error updating notice:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.delete('/:id', async (req, res) => {
  const noticeId = parseInt(req.params.id, 10);
  try {
    const result = await deleteNotice(noticeId);
    if (result) {
      res.json({ message: "Notice deleted successfully" });
    } else {
      res.status(404).json({ error: "Notice not found" });
    }
  } catch (error) {
    console.error("Error deleting notice:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;