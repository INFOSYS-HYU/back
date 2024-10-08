const AWS = require("aws-sdk");
const secretsManager = new AWS.SecretsManager();
const mysql = require("mysql2");
const moment = require("moment-timezone");
require("dotenv").config();

// Create the connection pool. The pool-specific settings are the defaults
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

const promisePool = pool.promise();

// 새로운 토큰 관리 함수들

// Refresh Token 삭제 함수
const deleteRefreshToken = async (userId) => {
  try {
    await promisePool.query("DELETE FROM RefreshToken WHERE User_UID = ?", [
      userId,
    ]);
  } catch (error) {
    console.error("Error deleting refresh token:", error);
    throw error;
  }
};

async function findOrCreateUser(userId,email,name) {
  try {
    console.log("프로필: ", userId);
    const [rows] = await promisePool.query(
      "SELECT * FROM User WHERE User_UID = ?",
      [userId]
    );

    if (rows.length > 0) {
      // 사용자가 이미 존재하면 해당 사용자 정보 반환
      return rows[0];
    } else {
      // 새 사용자 생성
      const [result] = await promisePool.query(
        "INSERT INTO User (User_UID, Email, Name) VALUES (?, ?, ?)",
        [userId, email, name]
      );

      return {
        id: result.insertId,
        userId: userId,
        email: email,
        name: name,
      };
    }
  } catch (error) {
    console.error("Error in findOrCreateUser:", error);
    throw error;
  }
}

async function findUserById(googleId) {
  try {
    const [rows] = await promisePool.query(
      "SELECT * FROM User WHERE User_UID = ?",
      [googleId]
    );

    if (rows.length > 0) {
      return rows[0];
    } else {
      return null; // 사용자를 찾지 못한 경우
    }
  } catch (error) {
    console.error("Error in findUserById:", error);
    throw error;
  }
}

async function storeRefreshToken(userId, refreshToken) {
  try {
    await promisePool.query(
      "INSERT INTO RefreshToken (User_UID, RefreshToken) VALUES (?, ?) ON DUPLICATE KEY UPDATE refreshToken = ?",
      [userId, refreshToken, refreshToken]
    );
    console.log("Refresh token stored or updated in database");
  } catch (error) {
    console.error("Error storing refresh token in database:", error);
  }
}

const getRefreshToken = async (userId) => {
  try {
    const [rows] = await promisePool.query(
      "SELECT RefreshToken FROM RefreshToken WHERE User_UID = ?",
      [userId]
    );
    if (rows.length > 0) {
      return rows[0].refreshToken;
    } else {
      console.log("No refresh token found for userId:", userId);
      return false;
    }
  } catch (error) {
    console.error("Error retrieving refresh token from database:", error);
    return null;
  }
};

const createNotice = async (title, content) => {
  try {
    const [result] = await promisePool.query(
      "INSERT INTO Notice (Title, Content, Upload_DATE) VALUES (?, ?, NOW())",
      [title, content]
    );
    return { id: result.insertId, title, content };
  } catch (error) {
    console.error("Error creating notice:", error);
    throw error;
  }
};

const saveNoticeImages = async (noticeId, files) => {
  try {
    // 이미지 정보를 데이터베이스에 저장
    const imageUrls = files.map((file) => file.location); // S3에서 업로드된 이미지 URL

    // 여러 이미지 정보를 삽입
    for (const imageUrl of imageUrls) {
      await promisePool.query(
        "INSERT INTO Notice_Image (Notice_ID, ImageURL) VALUES (?, ?)",
        [noticeId, imageUrl]
      );
    }
  } catch (error) {
    console.error("Error saving notice images:", error);
    throw error;
  }
};

const updateNotice = async (id, title, content) => {
  try {
    const [result] = await promisePool.query(
      "UPDATE Notice SET Title = ?, Content = ? WHERE NoticeID = ?",
      [title, content, id]
    );
    if (result.affectedRows > 0) {
      return { id, title, content };
    }
    return null;
  } catch (error) {
    console.error("Error updating notice:", error);
    throw error;
  }
};

const deleteNotice = async (id) => {
  try {
    const [result] = await promisePool.query(
      "DELETE FROM Notice WHERE NoticeID = ?",
      [id]
    );
    return result.affectedRows > 0;
  } catch (error) {
    console.error("Error deleting notice:", error);
    throw error;
  }
};

const getNotice = async (page = 1, limit = 10) => {
  try {
    const offset = (page - 1) * limit;

    // Get total count of notices
    const [countResult] = await promisePool.query(
      "SELECT COUNT(*) AS total FROM Notice;"
    );
    const totalNotices = countResult[0].total;

    // Get paginated notices
    const [rows] = await promisePool.query(
      `SELECT NoticeID AS id, Title AS title, Content AS content, Upload_DATE AS date 
       FROM Notice 
       ORDER BY Upload_DATE DESC
       LIMIT ? OFFSET ?;`,
      [limit, offset]
    );

    const notices = rows.map((row) => ({
      id: row.id,
      title: row.title,
      desc: row.content,
      date: moment.tz(row.date, "Asia/Seoul").format("YYYY-MM-DD HH:mm:ss"),
    }));

    const totalPages = Math.ceil(totalNotices / limit);

    console.log(notices);
    return {
      notices,
      currentPage: page,
      totalPages,
      totalNotices,
    };
  } catch (error) {
    if (error.code === "ETIMEDOUT" && retries > 0) {
      console.log(
        `Connection timed out. Retrying... (${retries} attempts left)`
      );
      return getNotice(page, limit, retries - 1);
    }
    console.error("Error fetching notices:", error);
    throw error;
  }
};

// 특정 공지사항을 ID로 조회하는 함수
const getNoticeById = async (id) => {
  try {
    const [rows] = await promisePool.query(
      "SELECT Notice_ID AS id, Title AS title, Content AS content, Upload_DATE AS date FROM Notice WHERE Notice_ID = ?",
      [id]
    );

    if (rows.length === 0) {
      return null; // 공지사항이 존재하지 않을 경우 null 반환
    }

    const notice = rows[0];

    // 공지사항에 연결된 이미지 URL 가져오기
    const [imageRows] = await promisePool.query(
      "SELECT ImageURL FROM Notice_Image WHERE Notice_ID = ?",
      [id]
    );

    const imageUrls = imageRows.map((row) => row.ImageURL); // 이미지 URL 배열 생성

    return {
      id: notice.id,
      title: notice.title,
      desc: notice.content,
      date: moment.tz(notice.date, "Asia/Seoul").format("YYYY-MM-DD HH:mm:ss"),
      images: imageUrls,
    };
  } catch (error) {
    console.error("Error fetching notice by ID:", error);
    throw error; // 에러를 호출자에게 전달
  }
};

const getFinance = async () => {
  try {
    const [rows] = await promisePool.query(
      "SELECT Upload_DATE AS date, Year, Month, Quarter, Title AS title, Content AS content, Finance_ID AS financeId FROM Finance;"
    );

    // 데이터를 변환하여 요청한 형식으로 변경
    const financeData = rows.map((row) => ({
      id: row.financeId, // 여기에 적절한 ID를 설정 (예: Quarter를 ID로 사용)
      year: row.Year,
      month: row.Month,
      quarter: row.Quarter,
    }));

    console.log(financeData);
    return financeData;
  } catch (error) {
    console.error("Error fetching finance data:", error);
    throw error; // 에러를 호출자에게 전달
  }
};

// 특정 결산안을 ID로 조회하는 함수
const getFinanceById = async (id) => {
  try {
    const [rows] = await promisePool.query(
      "SELECT Upload_DATE AS date, Year, Month, Quarter, Title AS title, Content AS content, Finance_ID AS financeId FROM Finance WHERE Finance_ID = ?",
      [id]
    );

    if (rows.length === 0) {
      return null; // 결산안이 존재하지 않을 경우 null 반환
    }

    const finance = rows[0];
    return {
      id: finance.financeId,
      title: finance.title,
      year: finance.Year,
      month: finance.Month,
      quarter: finance.Quarter,
      image_url: finance.fileId ? [finance.fileId] : [], // `fileId`를 사용하여 이미지 URL 리스트 생성 (여러 파일일 경우를 고려하여 배열로 처리)
    };
  } catch (error) {
    console.error("Error fetching finance data by ID:", error);
    throw error; // 에러를 호출자에게 전달
  }
};

const deleteFinance = async (financeId) => {
  try {
    await promisePool.query("DELETE FROM Finance_Image WHERE Finance_ID = ?", [
      financeId,
    ]);

    // 결산안 삭제
    const [result] = await promisePool.query(
      "DELETE FROM Finance WHERE ID = ?",
      [financeId]
    );

    // 결과 반환: affectedRows가 1 이상이면 삭제 성공
    return result.affectedRows > 0;
  } catch (error) {
    console.error("Error deleting finance:", error);
    throw error;
  }
};

const getCalendar = async () => {
  try {
    const [rows] = await promisePool.query(
      "SELECT Calendar_ID AS id, startDate AS start, endDate AS end, title AS title, content AS content FROM Calendar;"
    );

    const calendar = rows.map((row) => ({
      id: row.id,
      startDate: new Date(row.start),
      endDate: new Date(row.end),
      title: row.title,
      content: row.content,
    }));

    console.log(calendar);
    return calendar;
  } catch (error) {
    console.error("Error fetching calendar:", error);
    throw error;
  }
};

const getAllGallery = async () => {
  try {
    // 전체 갤러리 목록을 가져옵니다.
    const [rows] = await promisePool.query(
      `SELECT Gallery_ID AS id, Title AS title, Content AS content, Upload_DATE AS date 
       FROM Gallery 
       ORDER BY Upload_DATE DESC;`
    );

    // 각 갤러리의 모든 이미지를 가져옵니다.
    const galleries = await Promise.all(
      rows.map(async (row) => {
        const [imageResult] = await promisePool.query(
          `SELECT ImageURL 
           FROM Gallery_Image 
           WHERE Gallery_ID = ? 
           ORDER BY Upload_DATE ASC;`, // 모든 이미지 가져오기
          [row.id]
        );

        // 모든 이미지 URL을 배열로 저장
        const imageUrls = imageResult.map((image) => image.ImageURL);

        return {
          id: row.id,
          title: row.title,
          desc: row.content,
          date: moment.tz(row.date, "Asia/Seoul").format("YYYY-MM-DD HH:mm:ss"),
          images: imageUrls, // 모든 이미지 URL 배열
        };
      })
    );

    console.log(galleries);
    return {
      galleries,
    };
  } catch (error) {
    console.error("Error fetching galleries:", error);
    throw error;
  }
};

const getGalleryById = async (id) => {
  try {
    const [rows] = await promisePool.query(
      "SELECT Gallery_ID AS id, Title AS title, Content AS content, Upload_DATE AS date FROM Notice WHERE Gallery_ID = ?",
      [id]
    );

    if (rows.length === 0) {
      return null; // 공지사항이 존재하지 않을 경우 null 반환
    }

    const gallery = rows[0];

    // 공지사항에 연결된 이미지 URL 가져오기
    const [imageRows] = await promisePool.query(
      "SELECT ImageURL FROM Gallery_Image WHERE Gallery_ID = ?",
      [id]
    );

    const imageUrls = imageRows.map((row) => row.ImageURL); // 이미지 URL 배열 생성

    return {
      id: gallery.id,
      title: gallery.title,
      desc: gallery.content,
      date: moment.tz(gallery.date, "Asia/Seoul").format("YYYY-MM-DD HH:mm:ss"),
      images: imageUrls,
    };
  } catch (error) {
    console.error("Error fetching notice by ID:", error);
    throw error; // 에러를 호출자에게 전달
  }
};

const getGallery = async (page = 1, limit = 10) => {
  try {
    const offset = (page - 1) * limit;

    // Get total count of notices
    const [countResult] = await promisePool.query(
      "SELECT COUNT(*) AS total FROM Gallery;"
    );
    const totalGalleries = countResult[0].total;

    // Get paginated notices
    const [rows] = await promisePool.query(
      `SELECT GalleryID AS id, Title AS title, Content AS content, Upload_DATE AS date 
       FROM Notice 
       ORDER BY Upload_DATE DESC
       LIMIT ? OFFSET ?;`,
      [limit, offset]
    );

    const galleries = await Promise.all(
      rows.map(async (row) => {
        const [imageResult] = await promisePool.query(
          `SELECT ImageURL 
           FROM Gallery_Image 
           WHERE Gallery_ID = ? 
           ORDER BY Upload_DATE ASC 
           LIMIT 1;`,
          [row.id]
        );

        const firstImageUrl =
          imageResult.length > 0 ? imageResult[0].ImageURL : null;

        return {
          id: row.id,
          title: row.title,
          desc: row.content,
          date: moment.tz(row.date, "Asia/Seoul").format("YYYY-MM-DD HH:mm:ss"),
          img1: firstImageUrl, // 첫 번째 이미지 URL
        };
      })
    );

    const totalPages = Math.ceil(totalNotices / limit);

    console.log(galleries);
    return {
      galleries,
      currentPage: page,
      totalPages,
      totalGalleries,
    };
  } catch (error) {
    if (error.code === "ETIMEDOUT" && retries > 0) {
      console.log(
        `Connection timed out. Retrying... (${retries} attempts left)`
      );
      return getGallery(page, limit, retries - 1);
    }
    console.error("Error fetching notices:", error);
    throw error;
  }
};

// 갤러리 게시물을 생성하는 함수
const createGallery = async (title, content) => {
  try {
    const [result] = await promisePool.query(
      "INSERT INTO Gallery (Title, Content, Upload_DATE) VALUES (?, ?, NOW())",
      [title, content]
    );
    return { id: result.insertId, title, content };
  } catch (error) {
    console.error("Error creating Gallery:", error);
    throw error;
  }
};

// 갤러리 게시물을 수정하는 함수
const updateGallery = async (galleryId, title, upload_date, content) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction(); // 트랜잭션 시작

    // Gallery 테이블에서 게시물 업데이트
    const [updateResult] = await connection.query(
      "UPDATE Gallery SET Title = ?, Content = ?, Upload_DATE = ? WHERE GalleryID = ?",
      [title, content, upload_date, galleryId]
    );

    if (updateResult.affectedRows === 0) {
      throw new Error("No gallery post found with the provided ID.");
    }

    // Gallery_Image 테이블에서 기존 이미지 삭제
    await connection.query("DELETE FROM Gallery_Image WHERE Gallery_ID = ?", [
      galleryId,
    ]);

    // Gallery_Image 테이블에 새로운 이미지 추가
    if (image_urls && image_urls.length > 0) {
      const insertImagePromises = image_urls.map((imageUrl) => {
        return connection.query(
          "INSERT INTO Gallery_Image (ImageURL, Gallery_ID) VALUES (?, ?)",
          [imageUrl, galleryId]
        );
      });

      await Promise.all(insertImagePromises); // 모든 이미지 추가 완료 대기
    }

    await connection.commit(); // 트랜잭션 커밋

    return { id: galleryId, title, content };
  } catch (error) {
    await connection.rollback(); // 에러 발생 시 트랜잭션 롤백
    console.error("Error updating gallery:", error);
    throw error;
  } finally {
    connection.release(); // 연결 해제
  }
};

// 갤러리 게시물을 삭제하는 함수
const deleteGallery = async (galleryId) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction(); // 트랜잭션 시작

    // Gallery_Image 테이블에서 해당 게시물의 모든 이미지 삭제
    await connection.query("DELETE FROM Gallery_Image WHERE Gallery_ID = ?", [
      galleryId,
    ]);

    // Gallery 테이블에서 게시물 삭제
    const [result] = await connection.query(
      "DELETE FROM Gallery WHERE GalleryID = ?",
      [galleryId]
    );

    if (result.affectedRows === 0) {
      throw new Error("No gallery post found with the provided ID.");
    }

    await connection.commit(); // 트랜잭션 커밋

    return true; // 삭제 성공
  } catch (error) {
    await connection.rollback(); // 에러 발생 시 트랜잭션 롤백
    console.error("Error deleting gallery:", error);
    throw error;
  } finally {
    connection.release(); // 연결 해제
  }
};

const saveGalleryImages = async (galleryid, files) => {
  try {
    // 이미지 정보를 데이터베이스에 저장
    const imageUrls = files.map((file) => file.location); // S3에서 업로드된 이미지 URL

    // 여러 이미지 정보를 삽입
    for (const imageUrl of imageUrls) {
      await promisePool.query(
        "INSERT INTO Gallery_Image (Gallery_ID, ImageURL) VALUES (?, ?)",
        [galleryid, imageUrl]
      );
    }
  } catch (error) {
    console.error("Error saving notice images:", error);
    throw error;
  }
};

// 캘린더 생성 함수
const createCalendar = async (startDate, endDate, title, content) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction(); // 트랜잭션 시작

    // Calendar 테이블에 이벤트 추가
    const [result] = await connection.query(
      "INSERT INTO Calendar (startDate, endDate, title, content) VALUES (?, ?, ?, ?)",
      [startDate, endDate, title, content]
    );

    await connection.commit(); // 트랜잭션 커밋

    return { id: result.insertId, startDate, endDate, title, content };
  } catch (error) {
    await connection.rollback(); // 에러 발생 시 트랜잭션 롤백
    console.error("Error creating calendar event:", error);
    throw error;
  } finally {
    connection.release(); // 연결 해제
  }
};

// 캘린더 업데이트 함수
const updateCalendar = async (id, startDate, endDate, title, content) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction(); // 트랜잭션 시작

    // Calendar 테이블에서 이벤트 업데이트
    const [updateResult] = await connection.query(
      "UPDATE Calendar SET startDate = ?, endDate = ?, title = ?, content = ? WHERE id = ?",
      [startDate, endDate, title, content, id]
    );

    if (updateResult.affectedRows === 0) {
      throw new Error("No calendar event found with the provided ID.");
    }

    await connection.commit(); // 트랜잭션 커밋

    return { id, startDate, endDate, title, content };
  } catch (error) {
    await connection.rollback(); // 에러 발생 시 트랜잭션 롤백
    console.error("Error updating calendar event:", error);
    throw error;
  } finally {
    connection.release(); // 연결 해제
  }
};

// 캘린더 삭제 함수
const deleteCalendar = async (id) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction(); // 트랜잭션 시작

    // Calendar 테이블에서 이벤트 삭제
    const [result] = await connection.query(
      "DELETE FROM Calendar WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      throw new Error("No calendar event found with the provided ID.");
    }

    await connection.commit(); // 트랜잭션 커밋

    return true; // 삭제 성공
  } catch (error) {
    await connection.rollback(); // 에러 발생 시 트랜잭션 롤백
    console.error("Error deleting calendar event:", error);
    throw error;
  } finally {
    connection.release(); // 연결 해제
  }
};

const createFinance = async (title, content, quarter) => {
  try {
    const [result] = await promisePool.query(
      "INSERT INTO Finance (Title, Content, Upload_DATE, Quarter) VALUES (?, ?, NOW(), ?)",
      [title, content, quarter]
    );
    return { id: result.insertId, title, content };
  } catch (error) {
    console.error("Error creating notice:", error);
    throw error;
  }
};

const saveFinanceImages = async (financeId, files) => {
  try {
    // 이미지 정보를 데이터베이스에 저장
    const imageUrls = files.map((file) => file.location); // S3에서 업로드된 이미지 URL

    // 여러 이미지 정보를 삽입
    for (const imageUrl of imageUrls) {
      await promisePool.query(
        "INSERT INTO Finance_Image (Finance_ID, ImageURL) VALUES (?, ?)",
        [financeId, imageUrl]
      );
    }
  } catch (error) {
    console.error("Error saving notice images:", error);
    throw error;
  }
};

module.exports = {
  //notice
  getNotice,
  getNoticeById,
  createNotice,
  updateNotice,
  deleteNotice,
  saveNoticeImages,

  //finance
  getFinance,
  getFinanceById,
  createFinance,
  saveFinanceImages,
  deleteFinance,

  //calender
  getCalendar,
  createCalendar,
  updateCalendar,
  deleteCalendar,

  //gallery
  createGallery,
  updateGallery,
  deleteGallery,
  saveGalleryImages,
  getAllGallery,
  getGallery,
  getGalleryById,

  //login
  storeRefreshToken,
  deleteRefreshToken,
  getRefreshToken,
  findOrCreateUser,
  findUserById,
};
