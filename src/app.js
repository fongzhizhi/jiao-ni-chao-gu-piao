import { printStyleLog } from "./utils/util";
import axios from "axios";
import marked from "marked";

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
    axios
      .get(href)
      .then((res) => {
        if (res && res.data) {
          const html = marked.marked(res.data);
          document.getElementById("content").innerHTML = html;
          return;
        }
        failCatch();
      })
      .catch(failCatch);
    e.preventDefault();
  }

  function failCatch() {
    document.getElementById("content").innerHTML =
      '<p class="error">访问的文章不存在！</p>';
  }
}
