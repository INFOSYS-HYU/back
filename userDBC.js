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

const getNotice = async (retries = 3) => {
  try {
    const [rows] = await promisePool.query(
      "SELECT NoticeID AS id, Title AS title, Content AS content, Upload_DATE AS date FROM Notice;"
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
    if (error.code === "ETIMEDOUT" && retries > 0) {
      console.log(
        `Connection timed out. Retrying... (${retries} attempts left)`
      );
      return getNotice(retries - 1);
    }
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
      "SELECT id AS id, startDate AS start, endDate AS end, title AS title, content AS content FROM Calendar;"
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

module.exports = {
  getNotice,
  getNoticeById,
  getFinance,
  getFinanceById, // 추가된 함수
  getCalendar,
  createNotice,
  updateNotice,
  deleteNotice,
};
