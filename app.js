require('dotenv').config();
const express = require('express');
const { engine } = require('express-handlebars');
const session = require('express-session');
const { MongoStore } = require('connect-mongo');
const { BookRead, BookWrite } = require('./db');

const app = express();

const MSSV   = process.env.MSSV || '23IT159';
const HO_TEN = process.env.HO_TEN || 'Nguyen Van A';
const PREFIX = MSSV.slice(-3);                 // "159"
const VAT    = Number(MSSV.slice(-1)) + 4;     // 9 + 4 = 13

app.engine('handlebars', engine());
app.set('view engine', 'handlebars');
app.set('views', './views');
app.set('trust proxy', 1);                     // bắt buộc khi chạy sau proxy của Render

app.use(express.urlencoded({ extended: true }));

// STATELESS: session lưu trên Atlas, KHÔNG lưu trong RAM
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_WRITE_URI,
    collectionName: 'sessions',
    ttl: 60 * 60,                              // 1 giờ
    autoRemove: 'interval',
    autoRemoveInterval: 10
  }),
  cookie: { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 3600 * 1000 }
}));

// ĐỌC → tài khoản reader
app.get('/', async (req, res) => {
  try {
    const books = await BookRead.find().sort({ createdAt: -1 }).lean();
    req.session.visits = (req.session.visits || 0) + 1;
    const msg = req.session.msg; delete req.session.msg;     // flash message
    res.render('index', {
      books, msg, visits: req.session.visits,
      footer: { hoTen: HO_TEN, mssv: MSSV, vat: VAT, prefix: PREFIX }
    });
  } catch (e) {
    res.status(500).send('Lỗi đọc dữ liệu: ' + e.message);
  }
});

// GHI → tài khoản writer
app.post('/books', async (req, res) => {
  try {
    const maSP = (req.body.maSP || '').trim();
    const tenSach = (req.body.tenSach || '').trim();
    const giaGoc = Number(req.body.giaGoc);

    // Bộ lọc: mã SP phải bắt đầu bằng 3 số cuối MSSV
    if (!maSP.startsWith(PREFIX)) {
      req.session.msg = `❌ Từ chối: mã sản phẩm phải bắt đầu bằng "${PREFIX}"`;
      return res.redirect('/');
    }
    if (!tenSach || isNaN(giaGoc) || giaGoc <= 0) {
      req.session.msg = '❌ Dữ liệu không hợp lệ';
      return res.redirect('/');
    }

    // Tính giá sau thuế trước khi lưu
    const giaSauThue = Math.round(giaGoc * (1 + VAT / 100));
    await BookWrite.create({ maSP, tenSach, giaGoc, vat: VAT, giaSauThue });

    req.session.msg = '✅ Đã thêm sách thành công';
    res.redirect('/');
  } catch (e) {
    req.session.msg = '❌ Lỗi: ' + e.message;
    res.redirect('/');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server chạy cổng ' + PORT));