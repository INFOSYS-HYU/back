const express = require('express');
const router = express.Router();
const { getFinance, getFinanceById, createFinance, saveFinanceImages } = require('../userDBC');
const { S3Client } = require('@aws-sdk/client-s3');

const multer = require('multer');
const multerS3 = require('multer-s3');

const s3 = new S3Client({
  region: "ap-southeast-2",
  credentials: {
    accessKeyId: process.env.KeyId,
    secretAccessKey: process.env.Secretkey,
  },
});

const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: 'infosysweb',
    key: function (req, file, cb) {
      cb(null, Date.now().toString());
    },
  }),
});

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

// 생성
router.post('/', upload.array("img1", 10), async (req, res) => {
  const { title, content, quarter } = req.body;
  const files = req.files; // 업로드된 파일들
  
  try {
    const newFinance = await createFinance(title, content, quarter);

    // 공지사항에 관련된 파일 정보 저장
    if (files.length > 0) {
      await saveFinanceImages(newFinance.id, files);
    }
    
    res.status(201).json(newFinance);
  } catch (error) {
    console.error("Error creating notice:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// 결산안 삭제
router.delete('/:id', async (req, res) => {
  const financeId = parseInt(req.params.id, 10);
  try {
    const result = await deleteFinance(financeId);
    if (result) {
      res.json({ message: "Finance deleted successfully" });
    } else {
      res.status(404).json({ error: "Finance not found" });
    }
  } catch (error) {
    console.error("Error deleting notice:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;


