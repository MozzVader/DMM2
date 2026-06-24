window.DMM = window.DMM || {};
(function () {
  var _cache = null;

  DMM.getBaseUrl = function () {
    var nav = document.querySelector('.side-nav');
    return (nav && nav.dataset.baseUrl) || '/';
  };

  DMM.stripHtml = function (html) {
    var div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || '';
  };

  DMM.parseRss = function (xml) {
    var doc = new DOMParser().parseFromString(xml, 'text/xml');
    var items = doc.querySelectorAll('item');
    return Array.from(items).map(function (item) {
      var link = (item.querySelector('link') ? item.querySelector('link').textContent : '') || '';
      link = link.trim();
      var slug = link.split('/post/')[1] || '';
      var title = (item.querySelector('title') ? item.querySelector('title').textContent : '') || '';
      title = title.trim();
      var desc = (item.querySelector('description') ? item.querySelector('description').textContent : '') || '';
      desc = desc.trim();
      var contentEl =
        item.getElementsByTagNameNS('*', 'encoded')[0] ||
        item.querySelector('content\\:encoded') ||
        item.querySelector('encoded');
      var contentHtml = contentEl ? (contentEl.textContent || '') : '';
      var pubDate = (item.querySelector('pubDate') ? item.querySelector('pubDate').textContent : '') || '';
      return { title: title, slug: slug, link: link, desc: desc, contentHtml: contentHtml, pubDate: pubDate };
    });
  };

  DMM.fetchRssItems = async function () {
    if (_cache) return _cache;
    var resp = await fetch(DMM.getBaseUrl() + 'rss.xml');
    if (!resp.ok) throw new Error('RSS fetch failed');
    var xml = await resp.text();
    _cache = DMM.parseRss(xml);
    return _cache;
  };

  DMM.getRandomPostLink = async function () {
    var items = await DMM.fetchRssItems();
    if (items.length === 0) return null;
    return items[Math.floor(Math.random() * items.length)].link;
  };
})();