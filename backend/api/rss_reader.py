
import feedparser
import re
import requests

from bs4 import BeautifulSoup
from html.parser import HTMLParser
from urllib.parse import urlparse


class RSSReader:
    RSS_URL = "https://www.lrt.lt/naujienos/kultura?rss"

    def get_rss_data(self, rss_url=None):
        rss_url = rss_url or self.RSS_URL

        response = requests.get(
            rss_url,
            headers={"User-Agent": "Mozilla/5.0"},
            timeout=15
        )
        response.raise_for_status()

        feed = feedparser.parse(response.content)

        rss_data = {
            "feed_title": feed.feed.get("title", "Unknown"),
            "entries": []
        }

        for entry in feed.entries:
            summary = entry.get("summary", "")
            image_url = self.get_image_from_html(summary)

            if entry.get("media_thumbnail"):
                image_url = entry.media_thumbnail[0].get("url", "")

            elif entry.get("media_content"):
                image_url = entry.media_content[0].get("url", "")

            elif entry.get("enclosures"):
                for enclosure in entry.enclosures:
                    if enclosure.get("type", "").startswith("image/"):
                        image_url = enclosure.get(
                            "href", enclosure.get("url", "")
                        )
                        break

            summary = re.sub(
                r"<img\b[^>]*>|<br\s*/?>|&#x20;",
                "",
                summary,
                flags=re.IGNORECASE
            ).strip()

            # Convert summary HTML into readable text.
            summary = BeautifulSoup(
                summary, "html.parser"
            ).get_text(" ", strip=True)

            rss_data["entries"].append({
                "title": entry.get("title", ""),
                "date": entry.get("published", ""),
                "summary": summary,
                "url": entry.get("link", ""),
                "image": image_url
            })

        return rss_data

    def get_image_from_html(self, text):
        class ImageParser(HTMLParser):
            def __init__(self):
                super().__init__()
                self.image_url = ""

            def handle_starttag(self, tag, attrs):
                if tag == "img" and not self.image_url:
                    attrs = dict(attrs)
                    self.image_url = attrs.get("src", "")

        parser = ImageParser()
        parser.feed(text)

        return parser.image_url

    def get_article_data(self, url):
        parsed_url = urlparse(url)

        if (
            parsed_url.scheme != "https"
            or parsed_url.hostname != "www.lrt.lt"
            or not parsed_url.path.startswith("/naujienos/")
            or parsed_url.port not in (None, 443)
            or parsed_url.username
            or parsed_url.password
        ):
            raise ValueError("Invalid LRT article URL")

        response = requests.get(
            url,
            headers={"User-Agent": "Mozilla/5.0"},
            timeout=15
        )
        response.raise_for_status()
        response.encoding = "utf-8"

        soup = BeautifulSoup(response.text, "html.parser")

        def get_meta(*names):
            for name in names:
                tag = (
                    soup.find("meta", attrs={"property": name})
                    or soup.find("meta", attrs={"name": name})
                )

                if tag and tag.get("content"):
                    return tag["content"].strip()

            return ""

        article_data = {
            "title": get_meta("og:title") or (
                soup.title.get_text(strip=True) if soup.title else ""
            ),
            "date": get_meta(
                "article:published_time",
                "datePublished"
            ),
            "summary": get_meta("og:description", "description"),
            "image": get_meta("og:image"),
            "url": url,
            "text": ""
        }

        content = soup.find("article") or soup.find("main")

        if content:
            for tag in content.find_all(
                ["script", "style", "nav", "footer", "aside"]
            ):
                tag.decompose()

            paragraphs = content.find_all("p")

            article_data["text"] = "\n\n".join(
                p.get_text(" ", strip=True)
                for p in paragraphs
                if p.get_text(strip=True)
            )

        return article_data
