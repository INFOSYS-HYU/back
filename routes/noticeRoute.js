const express = require('express');
const router = express.Router();
const { getNotice, getNoticeById, createNotice, updateNotice, deleteNotice } = require('../userDBC');


// 전체 공지사항 목록 (페이지네이션 적용)
router.get('/:page', async (req, res) => {
  const page = parseInt(req.params.page, 10) || 1;
  const limit = 10; // 페이지당 항목 수
  try {
    const { notices, totalPages } = await getNotice(page, limit);
    res.json({ notices, totalPages, currentPage: page });
  } catch (error) {
    console.error("Error fetching notices:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// 최신 공지사항 4개 조회
router.get('/recent', async (req, res) => {
  try {
    const { notices } = await getNotice(1, 4);
    res.json(notices);
  } catch (error) {
    console.error("Error fetching recent notices:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


// 특정 공지사항 조회
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

// 공지사항 생성
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

// 공지사항 수정
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

// 공지사항 삭제
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