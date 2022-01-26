const Crawler = require("crawler");

/**
 * 收集请求路径
 * @returns {Promise<{title: string;uri: string;}[]>}
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
          const artcles = $(".articleList .atc_title > a");
          artcles.map((i, el) => {
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
      console.log(urlMap);
      res(urlMap);
    });
  });
}

// 收集文章
async function collectUrl2Json() {
  await collectUrl();
}
