const createError = require('create-error');
const formidable = require('formidable');
const express = require('express');
const path = require('path');
const fs = require('fs');

const imagemin = require('imagemin');
// const imageminMozjpeg = require('imagemin-mozjpeg');
const imageminPngquant = require('imagemin-pngquant');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, './')));

// Read configuration file
const config = JSON.parse(fs.readFileSync('config.json', 'utf-8'));

// Create /cache  folder if not exist
if (!fs.existsSync('cache')) {
  fs.mkdirSync('cache');
}

// Perform compression(Lossy)
// Automatically from folder when start server
(async () => {
  const files = await imagemin([config.path.source], {
    destination: config.path.destination,
    plugins: [
      // imageminMozjpeg({
      //   quality: config.image.quality,
      //   smooth: config.image.smooth,
      // }),
      imageminPngquant({
        quality: [config.image.quality / 100, config.image.quality / 1000 + 0.2],
      }),
    ],
  });

  if (files.length) {
    console.log('file(s) compressed !!');
  }
})();

// For browser support
// perform compression(Lossy)
app.post('/fatch/img', (req, res) => {
  const form = new formidable.IncomingForm({
    multiples: true,
    uploadDir: 'cache',
    keepExtensions: true,
  });

  form.parse(req, (err, _fields, file) => {
    if (err) throw err;
    const arr = [];

    // Support for single browser object
    if (!Array.isArray(file.file)) {
      arr.push(file.file);
    }

    const files = arr.length ? arr : file.file;

    // Change the native path to os navigation path
    // ...and save to cache folder with their respicative extension
    files.forEach((element) => {
      fs.rename(
        element.path.replace(/\\/g, () => '/'),
        `cache/${element.name}`,
        (error) => {
          if (error) throw error;
        },
      );
    });

    (async () => {
      const cacheFiles = await imagemin(['cache'], {
        destination: config.path.destination,
        plugins: [
          // imageminMozjpeg({
          //   quality: config.image.quality,
          //   smooth: config.image.smooth,
          // }),
          imageminPngquant({
            quality: [config.image.quality / 100, config.image.quality / 1000 + 0.2],
          }),
        ],
      });

      if (cacheFiles.length) {
        console.log('file(s) compressed !!');
        deleteCache();
      }

      res.redirect('/index.html');
    })();
  });
});

function deleteCache() {
  fs.readdir('cache', (err, files) => {
    if (err) return console.log(`Unable to scan directory: ${err}`);

    files.forEach((file) => {
      fs.unlink(`cache/${file}`, (error) => {
        if (error) throw error;
      });
    });
  });
}

// catch 404 and forward to error handler
app.use((_req, _res, next) => {
  next(createError(404));
});

// error handler
app.use((err, req, res, _next) => {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.redirect('/index.html');
});

module.exports = app;
