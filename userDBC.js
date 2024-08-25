const mysql = require("mysql2");
const moment = require("moment-timezone");
require("dotenv").config();

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

const getNotice = async () => {
  try {
    const [rows] = await promisePool.query(
      "SELECT NoticeID AS id, Title AS title, Content AS content, Upload_DATE AS date " +
      "FROM Notice " +
      "ORDER BY Upload_DATE DESC " +
      "LIMIT 4;"
    );

    const notices = rows.map((row) => ({
      id: row.id,
      title: row.title,
      desc: row.content,
      date: moment.tz(row.date, "Asia/Seoul").format("YYYY-MM-DD HH:mm:ss"),
    }));
    console.log(notices);
    return notices;
  } catch (error) {
    console.error("Error fetching notices:", error);
    throw error;
  }
};
// 특정 공지사항을 ID로 조회하는 함수
const getNoticeById = async (id) => {
  try {
    const [rows] = await promisePool.query(
      "SELECT NoticeID AS id, Title AS title, Content AS content, Upload_DATE AS date FROM Notice WHERE NoticeID = ?",
      [id]
    );

    if (rows.length === 0) {
      return null; // 공지사항이 존재하지 않을 경우 null 반환
    }

    const notice = rows[0];
    //이거 공지사항에 들어가는 이미지들은요..?
    return {
      id: notice.id,
      title: notice.title,
      desc: notice.content,
      date: moment.tz(notice.date, "Asia/Seoul").format("YYYY-MM-DD HH:mm:ss"),
    };
  } catch (error) {
    console.error("Error fetching notice by ID:", error);
    throw error; // 에러를 호출자에게 전달
  }
};

// 전체 결산안 데이터를 가져오는 함수
const getFinance = async () => {
  try {
    const [rows] = await promisePool.query(
      "SELECT Upload_DATE AS date, Quarter, Title AS title, Content AS content, File_ID AS fileId FROM Finance;"
    );

    // 데이터를 변환하여 요청한 형식으로 변경
    const financeData = rows.map((row) => ({
      id: row.fileId, // 여기에 적절한 ID를 설정 (예: Quarter를 ID로 사용)
      year: moment.tz(row.date, "Asia/Seoul").year(),
      month: moment.tz(row.date, "Asia/Seoul").month() + 1, // 월은 0부터 시작하므로 +1
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
      "SELECT Upload_DATE AS date, Quarter, Title AS title, Content AS content, File_ID AS fileId FROM Finance WHERE File_ID = ?",
      [id]
    );

    if (rows.length === 0) {
      return null; // 결산안이 존재하지 않을 경우 null 반환
    }

    const finance = rows[0];
    return {
      id: finance.fileId,
      title: finance.title,
      year: moment.tz(finance.date, "Asia/Seoul").year(),
      month: moment.tz(finance.date, "Asia/Seoul").month() + 1, // 월은 0부터 시작하므로 +1
      quarter: finance.Quarter,
      // image_url: finance.fileId ? [finance.fileId] : [], // `fileId`를 사용하여 이미지 URL 리스트 생성 (여러 파일일 경우를 고려하여 배열로 처리)
    };
  } catch (error) {
    console.error("Error fetching finance data by ID:", error);
    throw error; // 에러를 호출자에게 전달
  }
};

//달력 일정 호출
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

// 갤러리 게시물을 생성하는 함수
const createGallery = async (title, upload_date, content, image_urls) => {
  const connection = await pool.getConnection();
  try {
      await connection.beginTransaction(); // 트랜잭션 시작

      // Gallery 테이블에 게시물 추가
      const [result] = await connection.query(
          "INSERT INTO Gallery (Title, Content, Upload_DATE) VALUES (?, ?, NOW())",
          [title, content, upload_date]
      );

      const galleryId = result.insertId; // 새로 생성된 GalleryID

      // Gallery_Image 테이블에 이미지 추가
      if (image_urls && image_urls.length > 0) {
          const insertImagePromises = image_urls.map(imageUrl => {
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
      console.error("Error creating gallery:", error);
      throw error;
  } finally {
      connection.release(); // 연결 해제
  }
};

// 갤러리 게시물을 수정하는 함수
const updateGallery = async (galleryId, title, upload_date, content, image_urls) => {
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
    await connection.query(
      "DELETE FROM Gallery_Image WHERE Gallery_ID = ?",
      [galleryId]
    );

    // Gallery_Image 테이블에 새로운 이미지 추가
    if (image_urls && image_urls.length > 0) {
      const insertImagePromises = image_urls.map(imageUrl => {
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
    await connection.query(
      "DELETE FROM Gallery_Image WHERE Gallery_ID = ?",
      [galleryId]
    );

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

module.exports = {
  getNotice,
  getNoticeById,
  getFinance,
  getFinanceById, // 추가된 함수
  getCalendar,
  createNotice,
  updateNotice,
  deleteNotice,
  createGallery, //지환: 갤러리 DB 함수
  updateGallery,
  deleteGallery,
  createCalendar,
  updateCalendar,
  deleteCalendar
};
