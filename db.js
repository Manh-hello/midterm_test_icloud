const mongoose = require('mongoose');

const opts = { autoIndex: false, autoCreate: false }; // user không có quyền createIndex/createCollection

const readConn  = mongoose.createConnection(process.env.MONGO_READ_URI, opts);
const writeConn = mongoose.createConnection(process.env.MONGO_WRITE_URI, opts);

readConn.on('connected',  () => console.log('✔ Kết nối READ thành công'));
writeConn.on('connected', () => console.log('✔ Kết nối WRITE thành công'));

const bookSchema = new mongoose.Schema({
  maSP:       { type: String, required: true },
  tenSach:    { type: String, required: true },
  giaGoc:     { type: Number, required: true },
  vat:        Number,
  giaSauThue: Number,
  createdAt:  { type: Date, default: Date.now }
});

// Cùng schema, gắn vào 2 kết nối khác nhau
const BookRead  = readConn.model('Book', bookSchema, 'books');
const BookWrite = writeConn.model('Book', bookSchema, 'books');

module.exports = { BookRead, BookWrite };