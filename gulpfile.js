const path = require("path");
const fs = require("fs");
const cp = require("child_process");
const { series, parallel, src, dest, watch } = require("gulp");
const { babel } = require("@rollup/plugin-babel");
const resolve = require("rollup-plugin-node-resolve");
const commonjs = require("@rollup/plugin-commonjs");
const json = require("@rollup/plugin-json");
const express = require("express");
const gulpPlugins = require("gulp-load-plugins")();
const os = require("os");

/**
 * 全局配置
 */
const appConfig = {
  // => config
  /**生产环境 */
  isProd: false,
  /**文件监听 */
  watch: true,

  // => entry
  html_paths: "public/*.html",
  styles_paths: "src/styles/**/*.less",
  scripts_paths: "src/**/*.js",
  script_entry: "src/app.js",
  assets_paths: "src/assets/**/*",
  publicPaths: ["public/*", "!public/*.html"],

  // => output
  /**基础路径 */
  BASE_URL: "",
  /**输出路径 */
  dest: "dist",
  /**页面标题 */
  page_title: "教你炒股票学习路径指引",
  /**打包的css路径 */
  css_path: "index.css",
  /**打包的js路径 */
  js_path: "app.js",
  /**静态资源路径 */
  assets_path: "assets/",
};

/**
 * 目标输出路径
 * @param {string} relativePath
 */
function destPath(relativePath) {
  return path.resolve(appConfig.dest, relativePath);
}

/**
 * 清除缓存目录
 */
function cleanDist() {
  return src(appConfig.dest, { read: false, allowEmpty: true }).pipe(
    gulpPlugins.clean()
  );
}

/**
 * 样式编译
 */
function styleCompiler() {
  const plugins = [];
  // 编译
  plugins.push(gulpPlugins.less());
  // 合并
  plugins.push(gulpPlugins.concatCss(destPath(appConfig.css_path)));
  if (appConfig.isProd) {
    // 压缩
    plugins.push(gulpPlugins.cssnano());
    // 重命名
    plugins.push(gulpPlugins.rename({ suffix: ".min" }));
    appConfig.css_path = appConfig.css_path.replace(/$\.css/, ".min.css");
  }
  // 输出
  plugins.push(dest(appConfig.dest));

  let stream = src(appConfig.styles_paths);
  plugins.forEach((f) => (stream = stream.pipe(f)));

  return stream;
}

/**
 * 脚本编译
 */
function scriptCompiler() {
  const plugins = [];
  // sourceMap
  !appConfig.isProd && plugins.push(gulpPlugins.sourcemaps.init());
  // 编译
  plugins.push(
    // gulpPlugins.eslint(),
    // gulpPlugins.eslint.failAfterError(),
    gulpPlugins.betterRollup(
      {
        plugins: [
          // 让rollup支持第三方库的引用
          resolve({
            browser: true,
          }),
          commonjs(),
          babel({
            babelHelpers: "bundled",
            exclude: "node_modules/**",
            presets: ["@babel/preset-env"],
          }),

          json(),
        ],
      },
      {
        format: "cjs",
      }
    )
  );
  if (appConfig.isProd) {
    // 压缩
    plugins.push(gulpPlugins.minify());
    // 重命名
    plugins.push(rename({ suffix: ".min" }));
    appConfig.js_path = appConfig.css_path.replace(/$\.js/, ".min.js");
  }
  // 输出
  plugins.push(dest(appConfig.dest));

  let stream = src(appConfig.script_entry);
  plugins.forEach((f) => (stream = stream.pipe(f)));
  return stream;
}

/**
 * 静态资源拷贝
 */
function assetsCopy() {
  // assets
  const copyDest = path.resolve(appConfig.dest, "assets");
  src(appConfig.assets_paths).pipe(dest(copyDest));
  // public
  return src(appConfig.publicPaths).pipe(dest(appConfig.dest));
}

/**
 * html模板编译
 */
function htmlCompiler() {
  return src(appConfig.html_paths)
    .pipe(gulpPlugins.ejs(appConfig))
    .pipe(dest(appConfig.dest));
}

/**
 * 服务器
 */
function server(cb) {
  const app = express();
  const port = 3000;
  app.use(express.static(appConfig.dest));
  app.get("/", (req, res) => {
    res.sendFile(path.resolve(appConfig.dest, "index.html"));
  });
  app.get("/readme", (req, res) => {
    res.send(fs.readFileSync(path.resolve(__dirname, "README.md")).toString());
  });
  app.get("/crawler_caches/:title", (req, res) => {
    const title = req.params.title;
    console.log(req.params);
    const file = title && path.resolve(__dirname, "crawler_caches/" + title + '.md');
    console.log(file);
    const exist = file && fs.existsSync(file);
    if(!exist) {
      res.status(500).send('Did not find title!');
    } else {
      res.send(fs.readFileSync(file).toString());
    }
  });

  app.listen(port, () => {
    const url = `http://localhost:${port}`;
    console.log("[server running]", `App listening at ${url}`);
    cp.exec("start " + url);
  });
  cb();
}

/**
 * 设置为生产环境
 */
function setProdEnv(cb) {
  appConfig.isProd = true;
  cb();
}

/**
 * 构建任务监听
 */
function watchTask(cb) {
  if (!appConfig.watch) {
    return;
  }
  watch(appConfig.html_paths, htmlCompiler);
  watch(appConfig.styles_paths, styleCompiler);
  watch(appConfig.scripts_paths, scriptCompiler);
  watch(appConfig.assets_paths, assetsCopy);
  watch(appConfig.publicPaths, assetsCopy);
  cb();
}

/**
 * 执行爬虫脚本
 */
function run_crawl(cb) {
  const isExist = fs.existsSync(path.resolve(__dirname, "./crawler_caches"));
  if (isExist) {
    return cb();
  }
  return gulpPlugins.run("npm run crawl").exec();
}

/**
 * 生成readme.md文件
 */
function createReadMe(cb) {
  // 文章索引
  const articleIndex = [
    {
      title: '中枢理论前传',
      items: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 103],
    },
    {
      title: '引导篇',
      items: [72],
    },
    {
      title: '分型、笔、线段',
      items: [62, 65, 67, 69, 71, 77, 78],
    },
    {
      title: '中枢、走势和买卖点',
      items: [17, 83, 18, 63, 20, 21, 35, 101, 102, 53, 56],
    },
    {
      title: '背驰',
      items: [24, 25, 27, 29, 37, 43, 44, 64, 61],
    },
    {
      title: '同级别分解',
      items: [33, 36, 38, 39, 40],
    },
    {
      title: '实战操作与策略',
      items: [26, 31, 32, 41, 45, 46, 47, 48, 49, 50, 55, 68, 73, 74, 92, 106, 107, 108],
    },
    {
      title: '走势与买卖点的动态分析和立体分析',
      items: [86, 70, 79, 82, 88, 89, 90, 91, 93, 99],
    },
    {
      title: '心态',
      items: [80, 19, 23, 34, 42, 94, 95, 96, 105],
    },
    {
      title: '兵法',
      items: [28, 51, 66, 97, 98, 100],
    },
    {
      title: '中枢理论体系说明',
      items: [30, 52, 81, 84],
    },
    {
      title: '中枢理论未竟篇',
      items: [104],
    },
    {
      title: '缠中说禅市场杂说',
      items: [22, 75, 76, 85, 87],
    },
    {
      title: '线段概念出现之前的走势实例讲解',
      items: [54, 57, 58, 59, 60, 61],
    },
  ];
  // 创建md文件字符串
  let mdStr = '# 《教你炒股票108课》文章指引' + os.EOL;
  const jsonPath = path.resolve(__dirname, './crawler_caches/articleMap.json');
  const exist = fs.existsSync(jsonPath);
  const articleMap = exist ? JSON.parse(fs.readFileSync(jsonPath).toString()) : {};
  const artilcePre = '教你炒股票';
  articleIndex.forEach(item => {
    const title = item.title;
    let p = os.EOL + '## ' + title + os.EOL;
    item.items.forEach(i => {
      const article = articleMap[i] && articleMap[i].title || artilcePre + i;
      p += os.EOL + '+ ' + `[${article}](${i})`;
    });
    p += os.EOL;
    mdStr += p;
  });
  // 生成文件
  fs.writeFileSync(path.resolve(__dirname, 'README.md'), mdStr);
  cb();
}

/**
 * 构建
 */
exports.build = parallel(
  run_crawl,
  series(
    cleanDist,
    createReadMe,
    parallel(htmlCompiler, styleCompiler, scriptCompiler, assetsCopy, watchTask)
  )
);
exports.buildProd = series(setProdEnv, exports.build);
/**
 * 启动服务
 */
exports.server = server;
/**
 * 本地|默认
 */
exports.default = exports.dev = series(exports.build, exports.server);
/**
 * 生产环境
 */
exports.prod = series(exports.buildProd, exports.server);

/**
 * 测试
 */
exports.test = parallel(createReadMe);
