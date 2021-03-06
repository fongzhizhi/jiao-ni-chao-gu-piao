const Crawler = require("crawler");
const fs = require("fs-extra");
const path = require("path");
const os = require("os");

const defaultDownloadPath = path.resolve(__dirname, "../../crawler_caches");

/**
 * 收集请求路径
 * @returns {Promise<{title: string;url: string;}[]>}
 */
function collectUrl() {
  return new Promise((res) => {
    const urlMap = [];
    const queryEndEventName = "query-end";
    const c = new Crawler({
      callback: (err, res, done) => {
        if (err) {
          console.error(err);
        } else {
          const $ = res.$;
          // 查询文章
          const articles = $(".articleList .atc_title > a");
          articles.map((i, el) => {
            const title = el.firstChild && el.firstChild.data;
            const url = el.attribs && el.attribs.href;
            if (url && title && title.trim().startsWith("教你炒股票")) {
              urlMap.push({
                title,
                url,
              });
            }
          });
          // 判断是否有下一页
          const nextPageUrl = $(".SG_pgnext > a").attr("href");
          if (nextPageUrl) {
            // 继续查询下一页
            c.queue(nextPageUrl);
          } else {
            // 结束查询
            c.emit(queryEndEventName);
          }
        }
        done();
      },
    });

    // 目录首页
    c.queue("http://blog.sina.com.cn/s/articlelist_1215172700_10_1.html");

    // 监听查询结束事件
    c.addListener(queryEndEventName, () => {
      res(urlMap);
    });
  });
}

/**
 * 收集文章
 */
async function collectArticle(downloadPath) {
  downloadPath = downloadPath || defaultDownloadPath;
  const map = await collectUrl();
  const articleMap = {}; // 文章信息
  let total = map.length;

  const c = new Crawler({
    callback: (err, res, done) => {
      total--;
      if (err) {
        console.error(err);
      } else {
        const $ = res.$;
        const contentBody = $(".SG_connBody");
        // 收集信息
        const title = contentBody.find(".articalTitle .titName").text();
        const sourceUrl = res.options.uri;
        // 文章title信息
        title.match(/(\d+)/);
        articleMap[RegExp.$1 || title] = {
          title,
          url: sourceUrl,
        };

        let timer = contentBody.find(".articalTitle .time").text();
        if (timer.match(/\((.+)\)/)) {
          timer = RegExp.$1;
        }
        const content = getParagraphs(contentBody);
        // 转换为markdown文档
        createMarkDownFile({
          title,
          sourceUrl,
          content,
          timer,
          downloadPath,
        });
      }
      if (total <= 0) {
        !fs.existsSync(downloadPath) && fs.mkdirSync(downloadPath);
        const filePth = path.resolve(downloadPath, "articleMap.json");
        fs.writeFileSync(filePth, JSON.stringify(articleMap, null, 2));
      }
      done();
    },
  });
  map.forEach((item) => {
    c.queue(item.url);
  });
}

/**
 * @param contentBody {cheerio.Cheerio}
 */
function getParagraphs(contentBody) {
  const fonts = contentBody.find(
    ".articalContent > div > p, .articalContent > div > font"
  );
  let res = "";
  fonts.map((i, item) => {
    const paragraph = getChildContent(item, "");
    paragraph && (res += os.EOL + paragraph + os.EOL);
  });

  return res;

  function getChildContent(item, paragraph) {
    item.children &&
      item.children.forEach((e) => {
        if (e.name === "img") {
          e.attribs.real_src &&
            (paragraph +=
              os.EOL +
              `![${e.attribs.alt || e.attribs.title}](${e.attribs.real_src})` +
              os.EOL);
        } else {
          const text = e.data && e.data.trim();
          text && (paragraph += text);
          paragraph = getChildContent(e, paragraph);
        }
      });
    return paragraph;
  }
}

/**
 * 生成markdown文档
 * @param {{title: string; sourceUrl: string; content: string; timer: string; downloadPath?: string;}} opts
 */
function createMarkDownFile(opts) {
  const newLine = os.EOL;
  // title
  let mdStr = "## " + opts.title + newLine;
  // introduction
  mdStr += newLine;
  mdStr += "> ";
  mdStr += `原文地址：[${opts.title}](${opts.sourceUrl})`;
  mdStr += newLine;
  mdStr += "> " + newLine + "> ";
  mdStr += `时间：\`${opts.timer}\`` + newLine;
  // content
  mdStr += newLine + opts.content;
  // download
  if (opts.downloadPath) {
    !fs.existsSync(opts.downloadPath) && fs.mkdirSync(opts.downloadPath);
    const filePth = path.resolve(opts.downloadPath, opts.title + ".md");
    fs.writeFileSync(filePth, mdStr);
    console.log("[WritingFile", filePth);
  }
  return mdStr;
}

collectArticle();
