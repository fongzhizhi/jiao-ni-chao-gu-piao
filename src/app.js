import { printStyleLog } from "./utils/util";
import axios from "axios";
import marked from "marked";
import articleMap from "../crawler_caches/articleMap.json";

window.onload = () => {
  loadReadme();
};

/**
 * 加载readMe到首页
 */
function loadReadme() {
  axios
    .get("/readme")
    .then((res) => {
      if (res && res.data) {
        const readMeHtml = marked.marked(res.data);
        document.getElementById("readme").innerHTML = readMeHtml;
        directoryJump();
      }
    })
    .catch((err) => {
      printStyleLog("Server Error", err, undefined);
    });
}

/**
 * 目录跳转的监听
 */
function directoryJump() {
  const items = document.querySelectorAll("#readme li > a");
  items.forEach((a) => {
    a.addEventListener("click", clickHandle);
  });

  /**
   *
   * @param {Event} e
   */
  function clickHandle(e) {
    const href = e.target.getAttribute("href");
    const item = articleMap[href];
    const url = item && item.url;
    const title = item && item.title;
    if (!url && !title) {
      failCatch(url);
      e.preventDefault();
      return;
    }

    axios
      .get("/crawler_caches/" + title)
      .then((res) => {
        if (res && res.data) {
          const html = marked.marked(res.data);
          document.getElementById("content").innerHTML = html;
          return;
        }
        failCatch(url);
      })
      .catch(() => failCatch(url));
    e.preventDefault();
  }

  function failCatch(url) {
    let html = '<p class="error">访问的文章不存在！</p>';
    if (url) {
      html += `<p class="info">原文地址：<a href="${url}">${url}<a/></p>`;
    }
    document.getElementById("content").innerHTML = html;
  }
}
