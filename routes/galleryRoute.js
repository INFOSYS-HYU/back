const express = require('express');
const router = express.Router();
const { getAllGallery, getGallery,getGalleryById, createGallery, updateGallery, deleteGallery } = require('../userDBC');

router.get("/", async (req, res) => {
  try {
    const { galleries } = await getAllGallery();
    res.json(galleries);
    console.log(galleries);
  } catch (error) {
    console.error("Error fetching recent galleries:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// 전체 갤러리 목록 (페이지네이션 적용)
router.get("/:page", async (req, res) => {
  const page = parseInt(req.params.page, 10) || 1;
  const limit = 10; // 페이지당 항목 수
  try {
    const { galleries, totalPages } = await getGallery(page, limit);
    res.json({ galleries, totalPages, currentPage: page });
  } catch (error) {
    console.error("Error fetching galleries:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/detail/:id", async (req, res) => {
  const galleryID = parseInt(req.params.id, 10);

  try {
    const galleryData = await getGalleryById(galleryID);
    if (galleryData) {
      res.json(galleryData);
    } else {
      res.status(404).json({ error: "Gallery not found" });
    }
  } catch (error) {
    console.error("Error fetching gallery:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post('/', async (req, res) => {
  const { title, upload_date, content, image_urls } = req.body;

  if (!title || !upload_date || !content || !Array.isArray(image_urls)) {
    return res.status(400).json({ error: "필수 필드가 누락되었거나 유효하지 않습니다." });
  }

  try {
    const result = await createGallery(title, upload_date, content, image_urls);
    res.status(201).json({
      message: "갤러리 게시물이 성공적으로 생성되었습니다.",
      gallery: result
    });
  } catch (error) {
    console.error("Error creating gallery:", error);
    res.status(500).json({ error: "갤러리 게시물 생성 중 오류가 발생했습니다." });
  }
});

router.put('/:id', async (req, res) => {
  const galleryId = parseInt(req.params.id, 10);
  const { title, upload_date, content, image_urls } = req.body;

  if (!title || !upload_date || !content || !Array.isArray(image_urls)) {
    return res.status(400).json({ error: "필수 필드가 누락되었거나 유효하지 않습니다." });
  }

  try {
    const result = await updateGallery(galleryId, title, upload_date, content, image_urls);
    res.status(200).json({
      message: "갤러리 게시물이 성공적으로 수정되었습니다.",
      gallery: result
    });
  } catch (error) {
    console.error("Error updating gallery:", error);
    res.status(500).json({ error: "갤러리 게시물 수정 중 오류가 발생했습니다." });
  }
});

router.delete('/:id', async (req, res) => {
  const galleryId = parseInt(req.params.id, 10);

  try {
    const success = await deleteGallery(galleryId);

    if (success) {
      res.status(200).json({
        message: "갤러리 게시물이 성공적으로 삭제되었습니다."
      });
    } else {
      res.status(404).json({ error: "갤러리 게시물이 존재하지 않습니다." });
    }
  } catch (error) {
    console.error("Error deleting gallery:", error);
    res.status(500).json({ error: "갤러리 게시물 삭제 중 오류가 발생했습니다." });
  }
});


module.exports = router;